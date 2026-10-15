const vscode = require('vscode');

function port() {
  return vscode.workspace.getConfiguration('bearAgent').get('port', 7788);
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

function deactivate() {}

module.exports = { activate, deactivate };
