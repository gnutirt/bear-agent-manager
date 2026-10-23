const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');

function port() {
  return vscode.workspace.getConfiguration('bearAgent').get('port', 7788);
}

let bridgeStop;
const SECRET_FILE = /(^|[\\/])(\.env(\..*)?|\.npmrc|\.pypirc|\.netrc|id_(rsa|dsa|ecdsa|ed25519)|.*\.(pem|key|pfx|p12|kdbx|token)|credentials(\.json)?|\.credentials\.json|secrets?\.(json|ya?ml|toml)|tokens?\.(json|ya?ml|toml)|token|providers\.json)$/i;

function startBridge(context) {
  let stopped = false;
  let client = '';
  let pollController;
  const proposals = new Map();
  const url = (route) => `http://127.0.0.1:${port()}${route}`;
  const token = () => {
    try { return fs.readFileSync(path.join(os.homedir(), '.bear-agent-manager', 'token'), 'utf8').trim(); }
    catch { return ''; }
  };
  const headers = (value) => ({ 'content-type': 'application/json', 'x-room-token': value });
  const send = async (route, value, body, signal) => {
    const response = await fetch(url(route), {
      method: body === undefined ? 'GET' : 'POST',
      headers: headers(value),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  };
  const folders = () => (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
  const announce = async (value) => {
    const response = await send('/api/ide/hello', value, {
      ...(client ? { client } : {}),
      folders: folders(),
      focused: vscode.window.state.focused,
    });
    client = response.client;
  };
  const isWithin = (root, target) => {
    const rel = path.relative(root, target);
    return !rel || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
  };
  const operation = async (message) => {
    const { op, args } = message;
    if (op === 'open') {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(args.path));
      const line = Number.isInteger(args.line) ? Math.max(1, args.line) - 1 : undefined;
      const endLine = Number.isInteger(args.endLine) ? Math.max(line ?? 0, args.endLine - 1) : line;
      const selection = line === undefined ? undefined : new vscode.Range(
        new vscode.Position(Math.min(line, document.lineCount - 1), 0),
        new vscode.Position(Math.min(endLine, document.lineCount - 1), document.lineAt(Math.min(endLine, document.lineCount - 1)).text.length),
      );
      await vscode.window.showTextDocument(document, { preview: true, preserveFocus: true, ...(selection ? { selection } : {}) });
      return { text: `Opened ${args.path}${line === undefined ? '' : `:${line + 1}`}` };
    }
    if (op === 'diagnostics') {
      const root = path.resolve(args.cwd);
      const filter = typeof args.path === 'string' ? path.resolve(args.path) : '';
      const severity = ['Error', 'Warning', 'Information', 'Hint'];
      const lines = [];
      for (const [uri, diagnostics] of vscode.languages.getDiagnostics()) {
        if (uri.scheme !== 'file' || !isWithin(root, path.resolve(uri.fsPath))) continue;
        const relative = path.relative(root, uri.fsPath).split(path.sep).join('/');
        if (filter && path.resolve(uri.fsPath).toLowerCase() !== filter.toLowerCase()) continue;
        for (const item of diagnostics) {
          const messageText = String(item.message).replace(/\s+/g, ' ').trim().slice(0, 500);
          lines.push(`${relative}:${item.range.start.line + 1}:${item.range.start.character + 1} ${severity[item.severity] ?? 'Unknown'}${item.source ? ` ${item.source}` : ''} ${messageText}`);
          if (lines.length >= 200) return { text: lines.join('\n') };
        }
      }
      return { text: lines.join('\n') || 'No diagnostics.' };
    }
    if (op === 'selection') {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) throw new Error('No text is selected in VS Code.');
      const document = editor.document;
      if (document.uri.scheme !== 'file') throw new Error('The selection is not from a local file.');
      const root = path.resolve(args.cwd);
      const relative = path.relative(root, path.resolve(document.uri.fsPath));
      if (!isWithin(root, path.resolve(document.uri.fsPath))) throw new Error('The selected file is outside the agent working folder.');
      if (SECRET_FILE.test(relative)) throw new Error('The selected file looks like a secrets file.');
      const text = document.getText(editor.selection);
      if (Buffer.byteLength(text, 'utf8') > 20 * 1024) throw new Error('The selected text exceeds 20 KB.');
      return {
        path: document.uri.fsPath,
        startLine: editor.selection.start.line + 1,
        endLine: editor.selection.end.line + 1,
        text,
      };
    }
    if (op === 'diff') {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const proposal = vscode.Uri.parse(`bear-proposal:/${id}`);
      proposals.set(id, args.content);
      const document = await vscode.workspace.openTextDocument(proposal);
      await vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(args.path), document.uri, args.title || `Proposed: ${path.basename(args.path)}`);
      setTimeout(() => proposals.delete(id), 30 * 60_000).unref?.();   // safety net if the close event never fires
      return { text: 'Diff shown. The original file was not changed.' };
    }
    throw new Error('unknown op');
  };
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('bear-proposal', {
      provideTextDocumentContent(uri) { return proposals.get(uri.path.slice(1)) ?? ''; },
    }),
    // Free the proposed text when the diff tab closes, not while it is still on screen (VS Code may re-read
    // the right side at any time, which would otherwise show an empty file after five minutes).
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.uri.scheme === 'bear-proposal') proposals.delete(document.uri.path.slice(1));
    }),
  );

  // Focus/folder changes only re-announce: aborting the long-poll would lose a request the hub already handed
  // to this client (the hub drops it, then the agent waits 10 s for a 504). The poll keeps running.
  const refresh = () => {
    const auth = token();
    if (!client || !auth) return;   // run() owns the first hello; it reads folders/focus itself
    void announce(auth).catch(() => {});
  };
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(refresh),
    vscode.window.onDidChangeWindowState(refresh),
  );

  const run = async () => {
    while (!stopped) {
      try {
        const auth = token();
        if (!auth) throw new Error('hub token unavailable');
        await announce(auth);
        while (!stopped) {
          pollController = new AbortController();
          let item;
          try {
            item = await send(`/api/ide/next?client=${encodeURIComponent(client)}`, auth, undefined, pollController.signal);
          } catch (error) {
            if (stopped) return;
            throw error;
          } finally { pollController = undefined; }
          if (item.req) {
            let result;
            try { result = { client, req: item.req, ok: true, data: await operation(item) }; }
            catch (error) { result = { client, req: item.req, ok: false, error: String(error?.message ?? error) }; }
            await send('/api/ide/result', auth, result);
          }
        }
      } catch {
        if (stopped) return;
        client = '';
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };
  void run();
  bridgeStop = () => { stopped = true; pollController?.abort(); };
}

async function hubUp() {
  try {
    const r = await fetch(`http://127.0.0.1:${port()}/api/health`, { signal: AbortSignal.timeout(1000) });
    const j = await r.json(); return j.app === 'agent-room' || j.app === 'bear-agent-manager';
  } catch {
    return false;
  }
}

async function html(webview) {
  const local = vscode.Uri.parse(`http://127.0.0.1:${port()}/`);
  const target = (await vscode.env.asExternalUri(local)).toString();
  const up = await hubUp();
  const csp = `default-src 'none'; frame-src ${target} http://127.0.0.1:${port()} http://localhost:${port()}; style-src 'unsafe-inline'; script-src 'unsafe-inline'`;
  const body = up
    ? `<iframe src="${target}" style="border:0;width:100%;height:100vh;display:block"></iframe>`
    : `<div style="font:13px system-ui;padding:16px">
         <p><b>bear-agent-manager hub is not running.</b></p>
         <p>Open any Claude Code session that has the bear-agent-manager plugin: it starts the hub automatically. Then press Retry.</p>
         <button onclick="acquireVsCodeApi().postMessage('retry')">Retry</button>
       </div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">
    <style>html,body{margin:0;padding:0;height:100%;overflow:hidden}</style></head><body>${body}</body></html>`;
}

function wire(webview, onRetry) {
  webview.options = { enableScripts: true };
  webview.onDidReceiveMessage((m) => { if (m === 'retry') onRetry(); });
}

function activate(context) {
  startBridge(context);
  const provider = {
    async resolveWebviewView(view) {
      const render = async () => { view.webview.html = await html(view.webview); };
      wire(view.webview, render);
      await render();
    },
  };
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('bearAgent.panel', provider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand('bearAgent.open', async () => {
      const panel = vscode.window.createWebviewPanel('bearAgent', 'Bear Agent Manager', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
      const render = async () => { panel.webview.html = await html(panel.webview); };
      wire(panel.webview, render);
      await render();
    }),
  );
}

function deactivate() {
  bridgeStop?.();
  bridgeStop = undefined;
}

module.exports = { activate, deactivate };
