import json
from backend.router import Router

with open('backend/data/floors.json', 'r', encoding='utf-8') as f:
    floors = json.load(f)
with open('backend/data/nodes.json', 'r', encoding='utf-8') as f:
    nodes = json.load(f)
with open('backend/data/edges.json', 'r', encoding='utf-8') as f:
    edges = json.load(f)

router = Router(nodes, edges, floors)

start = 'N_G_S_ENT'
dest = 'RN_R214'

print('========================================')
print('        A* ROUTING ENGINE TESTS         ')
print('========================================')
print(f'Routing from Main South Entrance (Floor 0) to Room 214 (Floor 2)\n')

print('--- 1. FASTEST ROUTE ---')
r_fast = router.find_route(start, dest, mode='fastest')
print(f"Distance: {r_fast['distance']} m, ETA: {r_fast['eta_seconds']} s (~{r_fast['eta_seconds']//60} min), Stairs: {r_fast['stairs_count']}, Elevator: {r_fast['elevator_used']}")
for inst in r_fast['instructions']:
    print(f"  [{inst['step']}] {inst['text']}")

print('\n--- 2. ACCESSIBLE ROUTE (Avoid Stairs) ---')
r_acc = router.find_route(start, dest, mode='accessible')
print(f"Distance: {r_acc['distance']} m, ETA: {r_acc['eta_seconds']} s (~{r_acc['eta_seconds']//60} min), Stairs: {r_acc['stairs_count']}, Elevator: {r_acc['elevator_used']}")
for inst in r_acc['instructions']:
    print(f"  [{inst['step']}] {inst['text']}")

print('\n--- 3. EASY ROUTE (Fewer Turns) ---')
r_easy = router.find_route(start, dest, mode='easy')
print(f"Distance: {r_easy['distance']} m, ETA: {r_easy['eta_seconds']} s, Turns: {r_easy['turn_count']}, Stairs: {r_easy['stairs_count']}")
for inst in r_easy['instructions']:
    print(f"  [{inst['step']}] {inst['text']}")

print('\n--- 4. DYNAMIC REROUTING (Staircase A Closed) ---')
blocked_nodes = {'STAIR_A_0', 'STAIR_A_1', 'STAIR_A_2'}
r_reroute = router.find_route(start, dest, mode='fastest', blocked_nodes=blocked_nodes)
print(f"Rerouted Distance: {r_reroute['distance']} m, ETA: {r_reroute['eta_seconds']} s")
for inst in r_reroute['instructions']:
    print(f"  [{inst['step']}] {inst['text']}")
