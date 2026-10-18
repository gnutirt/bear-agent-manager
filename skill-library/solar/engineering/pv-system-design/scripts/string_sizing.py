"""String sizing check for one PV module / inverter pair (formulas: references/string-sizing.md).

Usage (all values from the datasheets; temperature coefficients in %/degC, usually negative):
  python string_sizing.py --voc 49.5 --vmp 41.6 --isc 13.9 --imp 13.2 \
      --beta-voc -0.27 --beta-vmp -0.35 --noct 45 \
      --tmin 10 --tmax-amb 40 --g 1000 \
      --vdc-max 1000 --mppt-min 200 --mppt-max 850 --isc-mppt-max 40 --strings 2 [--modules 18]

Prints N_min / N_max and, when --modules is given, the checks for that string length. No third-party packages.
"""
import argparse
import math


def voltage_at(v_stc, beta_pct, t_cell):
    return v_stc * (1 + beta_pct / 100 * (t_cell - 25))


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for name in ('voc', 'vmp', 'isc', 'imp', 'beta-voc', 'beta-vmp', 'noct', 'tmin', 'tmax-amb',
                 'vdc-max', 'mppt-min', 'mppt-max', 'isc-mppt-max'):
        p.add_argument('--' + name, type=float, required=True)
    p.add_argument('--g', type=float, default=1000.0, help='irradiance for the hot-cell estimate, W/m2')
    p.add_argument('--strings', type=int, default=1, help='parallel strings on one MPPT')
    p.add_argument('--modules', type=int, help='modules per string to check')
    a = p.parse_args(argv)

    t_cell_max = a.tmax_amb + (a.noct - 20) / 800 * a.g
    voc_max = voltage_at(a.voc, a.beta_voc, a.tmin)
    vmp_min = voltage_at(a.vmp, a.beta_vmp, t_cell_max)
    vmp_cold = voltage_at(a.vmp, a.beta_vmp, a.tmin)
    n_max = math.floor(a.vdc_max / voc_max)
    n_min = math.ceil(a.mppt_min / vmp_min)
    isc_max = 1.25 * a.isc

    print(f'T_cell,max = {t_cell_max:.1f} C   Voc_max = {voc_max:.2f} V   Vmp_min = {vmp_min:.2f} V   Vmp(Tmin) = {vmp_cold:.2f} V')
    print(f'N_max (Vdc,max) = {n_max}   N_min (MPPT min, hot) = {n_min}')
    if n_min > n_max:
        print('FAIL: no string length fits this module/inverter pair')
    print(f'Isc_max per string = {isc_max:.2f} A   x{a.strings} strings = {isc_max * a.strings:.2f} A '
          f'(MPPT limit {a.isc_mppt_max:.2f} A): {"OK" if isc_max * a.strings <= a.isc_mppt_max else "FAIL"}')

    if a.modules:
        n = a.modules
        checks = [
            ('Voc_max string <= Vdc,max', n * voc_max, a.vdc_max, n * voc_max <= a.vdc_max),
            ('Vmp hot string >= MPPT min', n * vmp_min, a.mppt_min, n * vmp_min >= a.mppt_min),
            ('Vmp cold string <= MPPT max', n * vmp_cold, a.mppt_max, n * vmp_cold <= a.mppt_max),
        ]
        for label, value, limit, ok in checks:
            print(f'{n} modules: {label}: {value:.1f} V vs {limit:.1f} V -> {"OK" if ok else "FAIL"}')
    print('Preliminary calculation: a licensed engineer must check it before construction.')


if __name__ == '__main__':
    main()
