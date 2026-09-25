import json
from backend.router import Router

with open('backend/data/floors.json', encoding='utf-8') as f: floors = json.load(f)
with open('backend/data/nodes.json', encoding='utf-8') as f: nodes = json.load(f)
with open('backend/data/edges.json', encoding='utf-8') as f: edges = json.load(f)

router = Router(nodes, edges, floors)

test_pairs = [
    ('CN_PARKING', 'RN_R214'),
    ('CN_SOUTH_GATE', 'CN_FOOD_COURT'),
    ('CN_FOOD_COURT', 'CN_CRICKET_GROUND'),
    ('N_G_S_ENT', 'RN_R214'),
    ('N_G_S_ENT', 'RN_LOC_4_EC_LAB_1'),
    ('N_G_S_ENT', 'RN_LOC_5_INCUBATION'),
]

for s, d in test_pairs:
    for mode in ['fastest', 'accessible', 'easy']:
        r = router.find_route(s, d, mode=mode)
        if r:
            print(f"Route {s} -> {d} ({mode}): dist={r['distance']}m, nodes={len(r['nodes'])}, stairs={r['stairs_count']}, elev={r['elevator_used']}")
        else:
            print(f"NO ROUTE: {s} -> {d} ({mode})")
