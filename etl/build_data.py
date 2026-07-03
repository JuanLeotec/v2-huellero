import pandas as pd, json, unicodedata
from collections import defaultdict, OrderedDict

MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
MARCA_LABELS = ['Entrada Mañana','Salida Mañana','Entrada Tarde','Salida Tarde']

df = pd.read_excel('/mnt/user-data/uploads/BaseDatosPowerBI.xlsx', sheet_name='Sheet1')
df = df[df['Nombre Completo'].notna()].copy()
df['Fecha'] = pd.to_datetime(df['Fecha'])
df = df.sort_values(['Nombre Completo','Fecha']).reset_index(drop=True)

# resolve one department per employee (mode)
dept_map = df.groupby('Nombre Completo')['Nombre de Departamento'].agg(lambda s: s.value_counts().idxmax()).to_dict()

def tstr(v):
    if pd.isna(v): return None
    s = str(v)
    return s[:5] if len(s) >= 5 else s

def fmt_date(d):
    return d.strftime('%Y-%m-%d')

ULTIMO_SABADO = fmt_date(df[df['Día de la semana']==5]['Fecha'].max())

FULL_DATA = []
for _, r in df.iterrows():
    n = r['Nombre Completo']
    dow = int(r['Día de la semana'])
    FULL_DATA.append({
        'n': n, 'd': dept_map[n],
        'fecha': fmt_date(r['Fecha']),
        'dia': DIAS[dow],
        'mes': MESES[r['Fecha'].month - 1],
        'em': tstr(r['Entrada mañana']), 'sm': tstr(r['Salida mañana']),
        'et': tstr(r['Entrada tarde']), 'st': tstr(r['Salida tarde']),
        'rm': int(r['Retardo Mañana']), 'rt': int(r['Retardo Tarde']),
        'mm': float(r['Minutos Retardo Mañana']), 'mt': float(r['Minutos Retardo Tarde']),
        'tt': float(r['Tiempo tardio total']),
        'es': 1 if (pd.notna(r['Hora Extra Sábado']) and r['Hora Extra Sábado'] > 0) else 0
    })

print('FULL_DATA records:', len(FULL_DATA))

# ---- SIN_MARCA ----
SIN_MARCA = []
for rec in FULL_DATA:
    if rec['dia'] == 'Sábado' and rec['fecha'] == ULTIMO_SABADO:
        continue  # último sábado: pendiente de captura, no se cuenta como olvido
    missing = []
    if not rec['em']: missing.append('Entrada Mañana')
    if not rec['sm']: missing.append('Salida Mañana')
    if not rec['et']: missing.append('Entrada Tarde')
    if not rec['st']: missing.append('Salida Tarde')
    if missing:
        SIN_MARCA.append({
            'fecha': rec['fecha'], 'dia': rec['dia'], 'mes': rec['mes'],
            'n': rec['n'], 'd': rec['d'],
            'em': rec['em'], 'sm': rec['sm'], 'et': rec['et'], 'st': rec['st'],
            'cant': len(missing), 'f': missing
        })
print('SIN_MARCA records:', len(SIN_MARCA))

# ---- DASHBOARD_DATA (RAW) agregado por empleado+mes ----
agg = defaultdict(lambda: {'mm':0.0,'mt':0.0,'tt':0.0,'rm':0,'rt':0,'cnt':0,'d':None})
for rec in FULL_DATA:
    key = (rec['n'], rec['mes'])
    a = agg[key]
    a['d'] = rec['d']
    a['mm'] += rec['mm']; a['mt'] += rec['mt']; a['tt'] += rec['tt']
    a['rm'] += rec['rm']; a['rt'] += rec['rt']; a['cnt'] += 1

DASHBOARD_DATA = []
meses_presentes = [m for m in MESES if any(k[1]==m for k in agg)]
for n in dept_map:
    for m in meses_presentes:
        key = (n, m)
        if key in agg:
            a = agg[key]
            DASHBOARD_DATA.append({'n':n,'d':a['d'],'mes':m,'anio':'2026','mm':round(a['mm'],1),'mt':round(a['mt'],1),'tt':round(a['tt'],1),'rm':a['rm'],'rt':a['rt'],'cnt':a['cnt']})
print('DASHBOARD_DATA records:', len(DASHBOARD_DATA))

# ---- WEEK_DATA: suma de tt por día de la semana (todo el rango) ----
WEEK_DATA = OrderedDict((d,0.0) for d in DIAS)
for rec in FULL_DATA:
    WEEK_DATA[rec['dia']] += rec['tt']
WEEK_DATA = {k: round(v,1) for k,v in WEEK_DATA.items()}
print('WEEK_DATA:', WEEK_DATA)

# ---- SEMANAS: semanas Lunes-Sabado ----
def week_monday(d):
    dt = pd.Timestamp(d)
    return dt - pd.Timedelta(days=dt.dayofweek)

weeks = defaultdict(list)
for rec in FULL_DATA:
    mon = week_monday(rec['fecha'])
    weeks[mon].append(rec)

olvido_by_emp_week = defaultdict(set)
for s in SIN_MARCA:
    mon = week_monday(s['fecha'])
    olvido_by_emp_week[mon].add(s['n'])

SEMANAS = []
for mon in sorted(weeks.keys()):
    sat = mon + pd.Timedelta(days=5)
    recs = weeks[mon]
    people_agg = defaultdict(lambda: {'d':None,'mm':0.0,'mt':0.0,'tt':0.0,'rm':0,'rt':0})
    for rec in recs:
        p = people_agg[rec['n']]
        p['d'] = rec['d']; p['mm'] += rec['mm']; p['mt'] += rec['mt']; p['tt'] += rec['tt']
        p['rm'] += rec['rm']; p['rt'] += rec['rt']
    olv_set = olvido_by_emp_week.get(mon, set())
    people = []
    for n, p in people_agg.items():
        people.append({'n':n,'d':p['d'],'mm':round(p['mm'],1),'mt':round(p['mt'],1),'tt':round(p['tt'],1),'rm':p['rm'],'rt':p['rt'],'olvidos': 1 if n in olv_set else 0})
    # personas con olvido esa semana pero sin ningún registro de asistencia esa semana (raro) -> aseguramos que aparezcan
    for n in olv_set:
        if n not in people_agg:
            people.append({'n':n,'d':dept_map[n],'mm':0,'mt':0,'tt':0,'rm':0,'rt':0,'olvidos':1})
    people.sort(key=lambda p: -p['tt'])
    SEMANAS.append({
        'label': f"{mon.strftime('%d/%m')} – {sat.strftime('%d/%m/%Y')}",
        'start': mon.strftime('%Y-%m-%d'),
        'total_tt': round(sum(p['tt'] for p in people),1),
        'con_tardio': sum(1 for p in people if p['tt']>0),
        'con_olvido': sum(1 for p in people if p['olvidos']>0),
        'total_mm': round(sum(p['mm'] for p in people),1),
        'total_mt': round(sum(p['mt'] for p in people),1),
        'people': people
    })
print('SEMANAS count:', len(SEMANAS))

# ---- CAL_DATA ----
CAL_DATA = defaultdict(dict)
for rec in FULL_DATA:
    is_olvido = 0
    is_sab = 1 if rec['dia']=='Sábado' else 0
    CAL_DATA[rec['n']][rec['fecha']] = [rec['mm'], rec['mt'], rec['tt'], 0, is_sab]
olvido_keys = set((s['n'], s['fecha']) for s in SIN_MARCA)
for (n, fecha) in olvido_keys:
    if fecha in CAL_DATA[n]:
        CAL_DATA[n][fecha][3] = 1

CAL_NAMES = sorted(dept_map.keys())
CAL_DATA = dict(CAL_DATA)

print('CAL_DATA employees:', len(CAL_DATA))

# ============ WRITE JS FILES ============
def js(obj):
    return json.dumps(obj, ensure_ascii=False)

with open('/home/claude/project/data/dashboard-data.js','w',encoding='utf-8') as f:
    f.write('window.DASHBOARD_DATA = ' + js(DASHBOARD_DATA) + ';\n\n')
    f.write('// Agregado semanal utilizado en "Días de la semana con más retardos"\n')
    f.write('window.WEEK_DATA = ' + js(WEEK_DATA) + ';\n')

with open('/home/claude/project/data/data.js','w',encoding='utf-8') as f:
    f.write('window.FULL_DATA = ' + js(FULL_DATA) + ';\n')

with open('/home/claude/project/data/sin_marca.js','w',encoding='utf-8') as f:
    f.write('window.SIN_MARCA = ' + js(SIN_MARCA) + ';\n\n')
    f.write('window.ULTIMO_SABADO = ' + js(ULTIMO_SABADO) + ';\n\n')
    f.write('window.SEMANAS = ' + js(SEMANAS) + ';\n')

with open('/home/claude/project/data/calendar-data.js','w',encoding='utf-8') as f:
    f.write('window.CAL_DATA = ' + js(CAL_DATA) + ';\n\n')
    f.write('window.CAL_ULTIMO_SAB = ' + js(ULTIMO_SABADO) + ';\n\n')
    f.write('window.CAL_NAMES = ' + js(CAL_NAMES) + ';\n')

print('Archivos escritos correctamente.')
