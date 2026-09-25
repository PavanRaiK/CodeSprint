import json
import os
import math

def create_dataset():
    # 1. Floors
    floors = [
        {"floor": -1, "id": "Campus", "name": "Campus Overview Map", "short_name": "Campus", "bg_image": "/blueprints/campus.png", "elevation": -5, "width": 1380, "height": 1600},
        {"floor": 0, "id": "G", "name": "Ground Floor", "short_name": "Ground", "bg_image": "/blueprints/ground.png", "elevation": 0, "width": 1000, "height": 1200},
        {"floor": 1, "id": "1", "name": "First Floor", "short_name": "1st", "bg_image": "/blueprints/first.png", "elevation": 4, "width": 1000, "height": 1200},
        {"floor": 2, "id": "2", "name": "Second Floor", "short_name": "2nd", "bg_image": "/blueprints/second.png", "elevation": 8, "width": 1000, "height": 1200},
        {"floor": 3, "id": "3", "name": "Third Floor", "short_name": "3rd", "bg_image": "/blueprints/third.png", "elevation": 12, "width": 1000, "height": 1200},
        {"floor": 4, "id": "4", "name": "Fourth Floor", "short_name": "4th", "bg_image": "/blueprints/fourth.png", "elevation": 16, "width": 1000, "height": 1200},
        {"floor": 5, "id": "5", "name": "Fifth Floor", "short_name": "5th", "bg_image": "/blueprints/fifth.png", "elevation": 20, "width": 1000, "height": 1200}
    ]

    nodes = []
    edges = []
    locations = []
    qr_checkpoints = []

    edge_id_counter = [1]
    def add_edge(from_id, to_id, distance=None, stairs=False, elevator=False, accessible=True, difficulty=0, turn_complexity=0, notes=""):
        # calculate Euclidean distance if not supplied
        n1 = next((n for n in nodes if n["id"] == from_id), None)
        n2 = next((n for n in nodes if n["id"] == to_id), None)
        if distance is None:
            if n1 and n2 and n1["floor"] == n2["floor"]:
                dx = n1["x"] - n2["x"]
                dy = n1["y"] - n2["y"]
                scale = 0.35 if n1["floor"] == -1 else 0.25 # scale factor for campus outdoor map vs indoor blueprints
                distance = round(math.sqrt(dx*dx + dy*dy) * scale, 1)
            elif stairs:
                distance = 15.0 # standard floor stairs length
            elif elevator:
                distance = 10.0 # elevator floor transition
            elif n1 and n2 and ((n1["floor"] == -1 and n2["floor"] == 0) or (n1["floor"] == 0 and n2["floor"] == -1)):
                distance = 15.0 # building entrance transition
            else:
                distance = 20.0
        
        eid = f"E_{edge_id_counter[0]}"
        edge_id_counter[0] += 1
        edges.append({
            "id": eid,
            "from": from_id,
            "to": to_id,
            "distance": float(distance),
            "travel_time_estimate": round(distance / 1.2 + (15 if stairs else (8 if elevator else 0)), 1),
            "stairs": stairs,
            "elevator": elevator,
            "accessible": accessible,
            "difficulty": difficulty,
            "turn_complexity": turn_complexity,
            "active": True,
            "notes": notes
        })
        # bidirectional edge
        eid_rev = f"E_{edge_id_counter[0]}"
        edge_id_counter[0] += 1
        edges.append({
            "id": eid_rev,
            "from": to_id,
            "to": from_id,
            "distance": float(distance),
            "travel_time_estimate": round(distance / 1.2 + (15 if stairs else (8 if elevator else 0)), 1),
            "stairs": stairs,
            "elevator": elevator,
            "accessible": accessible,
            "difficulty": difficulty,
            "turn_complexity": turn_complexity,
            "active": True,
            "notes": notes
        })

    # ==========================================
    # VERTICAL CIRCULATION NODES (Stairs & Lifts)
    # ==========================================
    for f in range(6):
        # Elevator 1 (West Lift Bank) - Accessible across ALL floors
        nodes.append({
            "id": f"ELEV_1_{f}",
            "name": f"West Lift Bank (Floor {f})",
            "type": "elevator",
            "floor": f,
            "x": 215,
            "y": 670,
            "accessible": True
        })
        # Staircase B (Central East) - Connects ALL floors 0..5
        nodes.append({
            "id": f"STAIR_B_{f}",
            "name": f"Staircase B (Floor {f})",
            "type": "staircase",
            "floor": f,
            "x": 660,
            "y": 470,
            "accessible": False
        })
        # Vertical connectors for Stairs B and Elevator
        if f > 0:
            add_edge(f"ELEV_1_{f-1}", f"ELEV_1_{f}", distance=10.0, elevator=True, accessible=True, difficulty=0, turn_complexity=0, notes="Elevator transition")
            add_edge(f"STAIR_B_{f-1}", f"STAIR_B_{f}", distance=15.0, stairs=True, accessible=False, difficulty=2, turn_complexity=1, notes="Staircase B floor flight")

    for f in range(4): # Floors 0, 1, 2, 3
        # Staircase A (North West)
        nodes.append({
            "id": f"STAIR_A_{f}",
            "name": f"Staircase A (Floor {f})",
            "type": "staircase",
            "floor": f,
            "x": 420,
            "y": 390,
            "accessible": False
        })
        # Staircase C (South West Central)
        nodes.append({
            "id": f"STAIR_C_{f}",
            "name": f"Staircase C (Floor {f})",
            "type": "staircase",
            "floor": f,
            "x": 350,
            "y": 660,
            "accessible": False
        })
        # Staircase D (South Corridor)
        nodes.append({
            "id": f"STAIR_D_{f}",
            "name": f"Staircase D (Floor {f})",
            "type": "staircase",
            "floor": f,
            "x": 410,
            "y": 845,
            "accessible": False
        })
        if f > 0:
            add_edge(f"STAIR_A_{f-1}", f"STAIR_A_{f}", distance=15.0, stairs=True, accessible=False, difficulty=2, turn_complexity=1, notes="Staircase A floor flight")
            add_edge(f"STAIR_C_{f-1}", f"STAIR_C_{f}", distance=15.0, stairs=True, accessible=False, difficulty=2, turn_complexity=1, notes="Staircase C floor flight")
            add_edge(f"STAIR_D_{f-1}", f"STAIR_D_{f}", distance=15.0, stairs=True, accessible=False, difficulty=2, turn_complexity=1, notes="Staircase D floor flight")

    # Library Internal Stair (Floors 0, 1, 2)
    for f in range(3):
        nodes.append({
            "id": f"STAIR_LIB_{f}",
            "name": f"Library Spiral Staircase (Floor {f})",
            "type": "staircase",
            "floor": f,
            "x": 285,
            "y": 785,
            "accessible": False
        })
        if f > 0:
            add_edge(f"STAIR_LIB_{f-1}", f"STAIR_LIB_{f}", distance=12.0, stairs=True, accessible=False, difficulty=2, turn_complexity=1, notes="Library internal stair")

    # Workshop Staircase (Floors 0..4)
    for f in range(5):
        nodes.append({
            "id": f"STAIR_WS_{f}",
            "name": f"Workshop Staircase (Floor {f})",
            "type": "staircase",
            "floor": f,
            "x": 575,
            "y": 80,
            "accessible": False
        })
        if f > 0:
            add_edge(f"STAIR_WS_{f-1}", f"STAIR_WS_{f}", distance=14.0, stairs=True, accessible=False, difficulty=2, turn_complexity=1, notes="Workshop stair")

    # ==========================================
    # CAMPUS LEVEL — OUTDOOR GROUNDS & BUILDINGS (FLOOR -1)
    # ==========================================
    campus_corridor_nodes = [
        # Parking & Highway entry
        ("CN_PARKING", "Sahyadri College Parking", "entrance", -1, 46, 1464),
        ("CN_PETROL", "Hindustan Petroleum (HP Petrol Bunk)", "landmark", -1, 245, 1558),
        ("CN_SOUTH_ENTRY_ROAD", "Campus Main Entry Road", "corridor", -1, 400, 1440),
        ("CN_SOUTH_GATE", "Campus Security Main Gate & Post Office", "entrance", -1, 642, 1405),

        # Lawn & Driveway
        ("CN_DRIVEWAY_SOUTH", "South Main Driveway near Event Lawn", "corridor", -1, 540, 1150),
        ("CN_EVENT_LAWN", "Sahyadri Open Lawn & Event Pavilion", "landmark", -1, 350, 1150),
        ("CN_YS_OFFICE", "Y.S Administrative Annex", "landmark", -1, 729, 1073),

        # Central Quadrangle & Academic Complex
        ("CN_CENTRAL_ROAD", "Central Campus Walkway & Crossroads", "intersection", -1, 540, 750),
        ("CN_MAIN_BLOCK_PORTICO", "Sahyadri College Of Engineering (Main Portico)", "entrance", -1, 451, 603),
        ("CN_MECH_CIVIL_PORTICO", "Mechanical and Civil Block Portico", "entrance", -1, 649, 533),

        # Food Court, Tel Office & Guest House
        ("CN_FOOD_COURT", "Sahyadri Food Court (Cafeteria)", "landmark", -1, 656, 718),
        ("CN_TEL_OFFICE", "Hostel & Telecom Office", "landmark", -1, 836, 733),
        ("CN_GUEST_HOUSE_RD", "East Campus Access Road", "corridor", -1, 850, 540),
        ("CN_GUEST_HOUSE", "Heritage Guest House Sahyadri", "landmark", -1, 991, 529),

        # Boys Hostel
        ("CN_HOSTEL_RD", "Boys Hostel Approach Road", "corridor", -1, 1150, 560),
        ("CN_BOYS_HOSTEL", "Sahyadri Boys Hostel", "landmark", -1, 1319, 588),

        # Cricket Grounds (North)
        ("CN_NORTH_RD", "North Road toward Sports Field", "corridor", -1, 580, 400),
        ("CN_CRICKET_GROUND", "Sahyadri Cricket Ground", "landmark", -1, 823, 380),
        ("CN_CRICKET_PITCH", "Cricket Ground Pavilion & Pitch", "landmark", -1, 846, 205),
        ("CN_SOUHARDHA_RD", "Northeast Grounds Access Road", "corridor", -1, 1100, 250),
        ("CN_SOUHARDHA_GROUND", "Souhardha Cricket Ground (Sahyadri)", "landmark", -1, 1316, 96),
    ]
    for cid, cname, ctype, cfloor, cx, cy in campus_corridor_nodes:
        nodes.append({"id": cid, "name": cname, "type": ctype, "floor": cfloor, "x": cx, "y": cy, "accessible": True})

    # Campus Road & Walkway Edges
    add_edge("CN_PARKING", "CN_SOUTH_ENTRY_ROAD", notes="Walkway from Parking")
    add_edge("CN_PETROL", "CN_SOUTH_ENTRY_ROAD", notes="Highway access")
    add_edge("CN_SOUTH_GATE", "CN_SOUTH_ENTRY_ROAD", notes="Gate checkpoint")
    add_edge("CN_SOUTH_ENTRY_ROAD", "CN_DRIVEWAY_SOUTH", notes="Campus South Driveway")
    add_edge("CN_DRIVEWAY_SOUTH", "CN_EVENT_LAWN", notes="Lawn path")
    add_edge("CN_DRIVEWAY_SOUTH", "CN_YS_OFFICE", notes="YS Annex path")
    add_edge("CN_DRIVEWAY_SOUTH", "CN_CENTRAL_ROAD", notes="Driveway to Central Plaza")

    add_edge("CN_CENTRAL_ROAD", "CN_MAIN_BLOCK_PORTICO", notes="Walkway to Main Academic Block")
    add_edge("CN_CENTRAL_ROAD", "CN_MECH_CIVIL_PORTICO", notes="Walkway to Mech & Civil Block")
    add_edge("CN_CENTRAL_ROAD", "CN_FOOD_COURT", notes="Main path to Food Court")
    add_edge("CN_FOOD_COURT", "CN_TEL_OFFICE", notes="Walkway past Food Court")
    add_edge("CN_TEL_OFFICE", "CN_GUEST_HOUSE_RD", notes="Road to Guest House")
    add_edge("CN_CENTRAL_ROAD", "CN_GUEST_HOUSE_RD", notes="East roadway")
    add_edge("CN_GUEST_HOUSE_RD", "CN_GUEST_HOUSE", notes="Guest house driveway")
    add_edge("CN_GUEST_HOUSE", "CN_HOSTEL_RD", notes="Road to Boys Hostel")
    add_edge("CN_HOSTEL_RD", "CN_BOYS_HOSTEL", notes="Boys Hostel entrance path")

    add_edge("CN_CENTRAL_ROAD", "CN_NORTH_RD", notes="North roadway toward sports grounds")
    add_edge("CN_NORTH_RD", "CN_CRICKET_GROUND", notes="Cricket Ground entry")
    add_edge("CN_CRICKET_GROUND", "CN_CRICKET_PITCH", notes="Cricket pitch access")
    add_edge("CN_CRICKET_GROUND", "CN_SOUHARDHA_RD", notes="Cross-field access road")
    add_edge("CN_HOSTEL_RD", "CN_SOUHARDHA_RD", notes="Hostel to Northeast road")
    add_edge("CN_SOUHARDHA_RD", "CN_SOUHARDHA_GROUND", notes="Souhardha ground entry")

    # Connect Campus Outdoor Network to Indoor Floor 0:
    # 1. Main Block Portico connects to Ground Floor Main South Entrance (N_G_S_ENT)
    add_edge("CN_MAIN_BLOCK_PORTICO", "N_G_S_ENT", distance=15.0, notes="Enter Main Academic Block from Campus")
    # 2. Mech & Civil Portico connects to Ground Floor East Entrance (N_G_E_MID)
    add_edge("CN_MECH_CIVIL_PORTICO", "N_G_E_MID", distance=25.0, notes="Enter Academic Complex via East Wing")

    # Campus Key Locations / Landmarks
    campus_locations_data = [
        ("LOC_C_MAIN_BLOCK", "Sahyadri College Of Engineering & Management", "building", -1, 451, 603, "Main Campus", ["main block", "main building", "sahyadri college of engineering", "engineering college", "academic block", "admin block"], "Main 5-story academic complex with Central Courtyard, Principal Chamber, Dean Offices, Classrooms, and Laboratories.", "CN_MAIN_BLOCK_PORTICO"),
        ("LOC_C_MECH_CIVIL", "Sahyadri College Mechanical and Civil Block", "building", -1, 649, 533, "Mechanical & Civil", ["mechanical and civil block", "mech block", "civil block", "mechanical building", "civil building", "mech civil"], "Dedicated academic and workshop block for Mechanical and Civil Engineering.", "CN_MECH_CIVIL_PORTICO"),
        ("LOC_C_FOOD_COURT", "Sahyadri Food Court (Cafeteria & Canteen)", "amenity", -1, 656, 718, "Campus Amenities", ["food court", "sahyadri food court", "canteen", "cafeteria", "mess", "dining", "snacks", "cafe", "food"], "Central multi-cuisine food court and student cafeteria.", "CN_FOOD_COURT"),
        ("LOC_C_TEL_OFFICE", "Hostel & Telephone Administration Office", "office", -1, 836, 733, "Administration", ["tel office", "telephone office", "hostel office", "estate office", "telecom office"], "Campus telecommunication, hostel admissions, and facilities office.", "CN_TEL_OFFICE"),
        ("LOC_C_GUEST_HOUSE", "Heritage Guest House Sahyadri College", "facility", -1, 991, 529, "Hospitality", ["heritage guest house", "guest house", "vip guest house", "visitors guesthouse", "heritage house"], "Guest suites for visiting professors, dignitaries, and academic delegates.", "CN_GUEST_HOUSE"),
        ("LOC_C_BOYS_HOSTEL", "Sahyadri Boys Hostel", "hostel", -1, 1319, 588, "Student Housing", ["boys hostel", "sahyadri boys hostel", "hostel", "mens hostel", "residence hall"], "On-campus boys residence and student living quarters.", "CN_BOYS_HOSTEL"),
        ("LOC_C_CRICKET_GROUND", "Sahyadri Cricket Ground", "sports", -1, 823, 380, "Physical Education & Sports", ["sahyadri cricket ground", "cricket ground", "main ground", "sports ground", "playground", "stadium"], "Collegiate turf cricket ground and track field.", "CN_CRICKET_GROUND"),
        ("LOC_C_CRICKET_PITCH", "Cricket Pitch & North Pavillion", "sports", -1, 846, 205, "Physical Education & Sports", ["cricket pitch", "pitch", "pavilion", "north ground"], "Cricket pitch practice wicket and north pavilion.", "CN_CRICKET_PITCH"),
        ("LOC_C_SOUHARDHA_GROUND", "Souhardha Cricket Ground (Sahyadri)", "sports", -1, 1316, 96, "Physical Education & Sports", ["souhardha cricket ground", "souhardha ground", "second cricket ground", "northeast ground"], "Souhardha athletic field and practice cricket oval on the northeast campus perimeter.", "CN_SOUHARDHA_GROUND"),
        ("LOC_C_PARKING", "Sahyadri College Parking", "parking", -1, 46, 1464, "Campus Security", ["parking", "college parking", "sahyadri parking", "car parking", "bike parking", "two wheeler parking"], "Multi-vehicle campus parking lot for two-wheelers, cars, and buses.", "CN_PARKING"),
        ("LOC_C_PETROL_BUNK", "Hindustan Petroleum (HP Petrol Pump)", "amenity", -1, 245, 1558, "Transit", ["hindustan petroleum", "petrol pump", "fuel station", "hp petrol bunk", "gas station"], "Hindustan Petroleum fueling station located right at the national highway campus entry point.", "CN_PETROL"),
        ("LOC_C_SECURITY_GATE", "Campus Security Main Gate & Post Office", "entrance", -1, 642, 1405, "Security & Logistics", ["post office", "security gate", "main gate", "security check", "po", "campus entrance gate"], "Primary security gateway, guard outpost, and on-campus postal clearance window.", "CN_SOUTH_GATE"),
        ("LOC_C_EVENT_LAWN", "Sahyadri Open Lawn & Event Pavilion", "outdoor", -1, 350, 1150, "Student Life", ["open lawn", "event pavilion", "pavilion", "big tent", "fest lawn", "canopy"], "Central event lawn featuring the large canopy structure for convocations and cultural fests.", "CN_EVENT_LAWN"),
        ("LOC_C_YS_ADMIN", "Y.S / Admin Extension", "office", -1, 729, 1073, "Administration", ["ys", "y.s", "admin extension", "south administrative annex"], "Administrative annex and campus security support facility.", "CN_YS_OFFICE")
    ]
    for lid, lname, ltype, lfloor, lx, ly, ldept, laliases, ldesc, lconn in campus_locations_data:
        locations.append({
            "id": lid,
            "name": lname,
            "type": ltype,
            "floor": lfloor,
            "node_id": lconn,
            "x": lx,
            "y": ly,
            "department": ldept,
            "aliases": laliases,
            "accessible": True,
            "description": ldesc
        })

    # ==========================================
    # FLOOR 0 — GROUND FLOOR
    # ==========================================
    # Corridor skeleton nodes
    g_corridors = [
        # South Corridor
        ("N_G_S_W", "South-West Corridor Junction", "intersection", 215, 880),
        ("N_G_S_ENT", "Main South Entrance Foyer", "entrance", 312, 880),
        ("N_G_S_40", "South Corridor near Mechanical Dept 40", "corridor", 350, 880),
        ("N_G_S_STAIR_D", "South Corridor near Staircase D", "corridor", 410, 880),
        ("N_G_S_MID", "South Corridor Central Junction", "intersection", 500, 880),
        ("N_G_S_E1", "South Corridor near Classroom 38", "corridor", 650, 880),
        ("N_G_S_E2", "South Corridor near Classroom 37", "corridor", 780, 880),
        ("N_G_S_E", "South-East Corridor Junction", "intersection", 900, 880),

        # West Corridor
        ("N_G_W_VISITORS", "West Corridor near Visitors Lounge 38", "corridor", 215, 825),
        ("N_G_W_PATIO", "West Patio Entrance Junction", "entrance", 215, 760),
        ("N_G_W_LIFT", "West Corridor Lift Foyer (Accessible)", "intersection", 215, 670),
        ("N_G_W_STUDY43", "West Corridor Study Space 43", "corridor", 215, 600),
        ("N_G_W_MID", "West Corridor Central Junction", "intersection", 215, 480),
        ("N_G_W_PLACEMENT", "West Corridor Placement Office 18", "corridor", 215, 375),
        ("N_G_W_N", "North-West Corridor Junction", "intersection", 215, 190),

        # North Corridor
        ("N_G_N_EXAM", "North Corridor Exam Section 14", "corridor", 440, 190),
        ("N_G_N_MID", "North Corridor Central Junction", "intersection", 500, 190),
        ("N_G_N_STORE", "North Corridor Store 11", "corridor", 645, 190),
        ("N_G_N_DIR", "North Corridor Director's Chamber 10", "corridor", 750, 190),
        ("N_G_N_E", "North-East Corridor Junction", "intersection", 900, 190),

        # East Corridor
        ("N_G_E_PRINCIPAL", "East Corridor Principal's Chamber 2", "corridor", 900, 290),
        ("N_G_E_ACADEMIC", "East Corridor Academic Section 3", "corridor", 900, 370),
        ("N_G_E_MID", "East Corridor Central Junction (East Entrance)", "intersection", 800, 480),
        ("N_G_E_COMP", "East Corridor Dept of Computers 23", "corridor", 800, 600),
        ("N_G_E_LAB5", "East Corridor Computer Lab-5 31", "corridor", 800, 710),

        # Central Cross Corridors
        ("N_G_C_MID", "Central Atrium Crossroads", "intersection", 500, 480),
        ("N_G_C_STAIR_A", "Corridor Junction near Staircase A", "intersection", 420, 440),
        ("N_G_C_STAIR_B", "Corridor Junction near Staircase B & East Entry", "intersection", 660, 480),
        ("N_G_C_STAIR_C", "Corridor Junction near Staircase C & Store 35", "intersection", 350, 660),
        ("N_G_C_STUDY32", "Central Corridor Study 32 & Seminar", "corridor", 500, 675),
    ]
    for cid, cname, ctype, cx, cy in g_corridors:
        nodes.append({"id": cid, "name": cname, "type": ctype, "floor": 0, "x": cx, "y": cy, "accessible": True})

    # Connect Ground floor horizontal and vertical spine
    add_edge("N_G_S_W", "N_G_S_ENT")
    add_edge("N_G_S_ENT", "N_G_S_40")
    add_edge("N_G_S_40", "N_G_S_STAIR_D")
    add_edge("N_G_S_STAIR_D", "N_G_S_MID")
    add_edge("N_G_S_MID", "N_G_S_E1")
    add_edge("N_G_S_E1", "N_G_S_E2")
    add_edge("N_G_S_E2", "N_G_S_E")

    add_edge("N_G_S_W", "N_G_W_VISITORS")
    add_edge("N_G_W_VISITORS", "N_G_W_PATIO")
    add_edge("N_G_W_PATIO", "N_G_W_LIFT")
    add_edge("N_G_W_LIFT", "N_G_W_STUDY43")
    add_edge("N_G_W_STUDY43", "N_G_W_MID")
    add_edge("N_G_W_MID", "N_G_W_PLACEMENT")
    add_edge("N_G_W_PLACEMENT", "N_G_W_N")

    add_edge("N_G_W_N", "N_G_N_EXAM")
    add_edge("N_G_N_EXAM", "N_G_N_MID")
    add_edge("N_G_N_MID", "N_G_N_STORE")
    add_edge("N_G_N_STORE", "N_G_N_DIR")
    add_edge("N_G_N_DIR", "N_G_N_E")

    add_edge("N_G_N_E", "N_G_E_PRINCIPAL")
    add_edge("N_G_E_PRINCIPAL", "N_G_E_ACADEMIC")
    add_edge("N_G_E_ACADEMIC", "N_G_E_MID")
    add_edge("N_G_E_MID", "N_G_E_COMP")
    add_edge("N_G_E_COMP", "N_G_E_LAB5")
    add_edge("N_G_E_LAB5", "N_G_S_E")

    # Central Cross connections
    add_edge("N_G_W_MID", "N_G_C_STAIR_A")
    add_edge("N_G_C_STAIR_A", "N_G_C_MID")
    add_edge("N_G_C_MID", "N_G_C_STAIR_B")
    add_edge("N_G_C_STAIR_B", "N_G_E_MID")

    add_edge("N_G_N_MID", "N_G_C_MID")
    add_edge("N_G_C_MID", "N_G_C_STUDY32")
    add_edge("N_G_C_STUDY32", "N_G_S_MID")

    # Connect Stairs & Lifts on Ground
    add_edge("ELEV_1_0", "N_G_W_LIFT", distance=5.0, notes="Lift foyer access")
    add_edge("STAIR_A_0", "N_G_C_STAIR_A", distance=8.0, notes="Staircase A access")
    add_edge("STAIR_B_0", "N_G_C_STAIR_B", distance=6.0, notes="Staircase B access")
    add_edge("STAIR_C_0", "N_G_C_STAIR_C", distance=8.0, notes="Staircase C access")
    add_edge("N_G_C_STAIR_C", "N_G_W_LIFT", distance=25.0)
    add_edge("N_G_C_STAIR_C", "N_G_C_STUDY32", distance=28.0)
    add_edge("STAIR_D_0", "N_G_S_STAIR_D", distance=5.0, notes="Staircase D access")
    add_edge("STAIR_LIB_0", "N_G_S_W", distance=22.0, notes="Library stair link")

    # Ground floor room destinations & nodes
    g_rooms = [
        ("LOC_G_MAIN_ENT", "Main Campus Entrance", "entrance", 0, 312, 920, "Campus Entry", ["main gate", "entrance", "foyer", "reception entrance", "south entrance"], "Main entrance from south portico", "N_G_S_ENT"),
        ("LOC_G_WEST_ENT", "West Campus Entrance", "entrance", 0, 100, 810, "Campus Entry", ["west gate", "west entry", "quadrangle gate"], "Entrance near security kiosk", "N_G_W_PATIO"),
        ("LOC_G_EAST_ENT", "East Academic Entrance", "entrance", 0, 650, 485, "Campus Entry", ["east gate", "east entry", "academic section gate"], "East entrance facing river quadrangle", "N_G_C_STAIR_B"),
        ("LOC_G_PRINCIPAL", "Principal's Chamber (Room 2)", "office", 0, 915, 290, "Administration", ["principal", "principal chamber", "principal office", "room 2", "2"], "Ground floor, north-east corner", "N_G_E_PRINCIPAL"),
        ("LOC_G_ACADEMIC", "Academic Section (Room 3)", "office", 0, 915, 370, "Administration", ["academic section", "academic office", "admission", "student affairs", "room 3", "3"], "Ground floor, east corridor", "N_G_E_ACADEMIC"),
        ("LOC_G_FOUNDATION", "Foundation Office (Room 9)", "office", 0, 900, 190, "Administration", ["foundation", "trust office", "chairman office", "room 9", "9"], "Ground floor, north-east wing", "N_G_N_E"),
        ("LOC_G_DIRECTOR", "Director's Chamber (Room 10)", "office", 0, 750, 190, "Administration", ["director", "director office", "room 10", "10"], "Ground floor, north corridor", "N_G_N_DIR"),
        ("LOC_G_STORE_11", "Central Store Room (Room 11)", "room", 0, 645, 190, "Services", ["store", "store room", "supplies", "room 11", "11"], "Ground floor, north corridor", "N_G_N_STORE"),
        ("LOC_G_PLACEMENT_EXAM", "Placement & Exam Cell (Room 14)", "office", 0, 440, 190, "Career Services", ["placement cell", "exam cell", "examination", "room 14", "14"], "Ground floor, north corridor", "N_G_N_EXAM"),
        ("LOC_G_PLACEMENT_OFFICE", "Placement Office (Room 18)", "office", 0, 200, 375, "Career Services", ["placement office", "department wise placement", "training and placement", "room 18", "18"], "Ground floor, long west corridor office", "N_G_W_PLACEMENT"),
        ("LOC_G_STUDY_21", "Study Space 21", "study_area", 0, 575, 485, "Campus Common", ["study space 21", "study 21", "open study", "central study", "21"], "Central corridor, between Courtyard 2 & 4", "N_G_C_STAIR_B"),
        ("LOC_G_DRAWING_22", "Drawing & Design Hall (Room 22)", "room", 0, 645, 600, "Engineering", ["drawing room", "drawing hall", "cad lab", "room 22", "22"], "East central wing", "N_G_E_COMP"),
        ("LOC_G_DEPT_COMP", "Department of Computer Science (Room 23)", "department", 0, 760, 600, "Computer Science", ["cse dept", "computer science", "dept of computers", "cse department", "room 23", "23"], "Ground floor, east academic wing", "N_G_E_COMP"),
        ("LOC_G_HOD_CS", "HOD Computer Science & Dept Library", "office", 0, 900, 610, "Computer Science", ["hod cse", "cse hod", "cs dept library", "computer science hod"], "East corridor inside CSE department", "N_G_E_COMP"),
        ("LOC_G_COMP_LAB_5", "Computer Lab-5 (Room 31)", "lab", 0, 915, 710, "Computer Science", ["computer lab 5", "lab 5", "cse lab 5", "programming lab", "room 31", "31"], "Ground floor, south-east wing", "N_G_E_LAB5"),
        ("LOC_G_SEMINAR_32", "Seminar Hall & Discussion Room 32", "hall", 0, 550, 675, "Campus Common", ["seminar 32", "discussion room", "room 32", "32"], "Central wing facing Courtyard 1", "N_G_C_STUDY32"),
        ("LOC_G_STUDY_33", "Courtyard Study Space 33", "study_area", 0, 645, 675, "Campus Common", ["study space 33", "study 33", "33"], "Courtyard 1 perimeter study area", "N_G_C_STUDY32"),
        ("LOC_G_GUEST_LOUNGE", "Guest Lounge & Quiet Area (Room 36)", "lounge", 0, 390, 760, "Hospitality", ["guest lounge", "quiet area", "visiting faculty lounge", "room 36", "36"], "South-west corridor", "N_G_S_40"),
        ("LOC_G_CLASS_37", "Classroom 37", "classroom", 0, 900, 880, "Classrooms", ["room 37", "cr 37", "classroom 37", "37"], "South-east corridor", "N_G_S_E"),
        ("LOC_G_VISITORS_LOUNGE", "Visitors Lounge (Room 38)", "lounge", 0, 195, 880, "Administration", ["visitors lounge", "waiting room", "parent lounge", "room 38", "38"], "Ground floor south-west, adjacent to main gate", "N_G_S_W"),
        ("LOC_G_SECURITY", "Campus Security & Helpdesk (Room 39)", "office", 0, 215, 825, "Security", ["security", "helpdesk", "enquiry", "reception", "room 39", "39"], "Near west entrance", "N_G_W_VISITORS"),
        ("LOC_G_DEPT_40", "Mechanical Department Office (Room 40)", "department", 0, 345, 880, "Mechanical", ["mechanical dept", "mech office", "room 40", "40"], "South corridor", "N_G_S_40"),
        ("LOC_G_MEETING_44", "Conference Room 44", "room", 0, 200, 535, "Administration", ["meeting room 44", "conference room", "board room", "room 44", "44"], "West corridor near Courtyard 2", "N_G_W_STUDY43"),
        ("LOC_G_COURT_1", "Courtyard 1 / Lecture Hall-1", "hall", 0, 730, 735, "Lecture Halls", ["courtyard 1", "lecture hall 1", "hall 1", "lh1"], "Open-air landscaped quadrangle 1", "N_G_C_STUDY32"),
        ("LOC_G_COURT_2", "Courtyard 2 / Lecture Hall-2", "hall", 0, 380, 540, "Lecture Halls", ["courtyard 2", "lecture hall 2", "hall 2", "lh2"], "Central-west landscaped courtyard 2", "N_G_C_STAIR_A"),
        ("LOC_G_COURT_3", "Courtyard 3 / Lecture Hall-4", "hall", 0, 380, 310, "Lecture Halls", ["courtyard 3", "lecture hall 4", "hall 4", "lh4"], "North-west landscaped courtyard 3", "N_G_C_STAIR_A"),
        ("LOC_G_COURT_4", "Courtyard 4 / Lecture Hall-3", "hall", 0, 715, 330, "Lecture Halls", ["courtyard 4", "lecture hall 3", "hall 3", "lh3"], "North-east landscaped courtyard 4", "N_G_C_STAIR_B"),
        ("LOC_G_WORKSHOP_46", "Workshop - Furnace & Forging (Room 46)", "workshop", 0, 320, 80, "Mechanical", ["furnace and forging", "forge shop", "workshop 46", "room 46", "46"], "Ground Floor Workshop section", "STAIR_WS_0"),
        ("LOC_G_WORKSHOP_45", "Workshop - Electrical Repair & Carpentry (Room 45)", "workshop", 0, 480, 80, "Electrical", ["electrical repair", "carpentry and fitting", "fitting shop", "room 45", "45"], "Ground Floor Workshop section", "STAIR_WS_0")
    ]

    for lid, lname, ltype, lfloor, lx, ly, ldept, laliases, ldesc, lconn in g_rooms:
        rnode_id = f"RN_{lid}"
        nodes.append({"id": rnode_id, "name": lname, "type": "room", "floor": lfloor, "x": lx, "y": ly, "accessible": True})
        add_edge(rnode_id, lconn, distance=5.0)
        locations.append({
            "id": lid,
            "name": lname,
            "type": ltype,
            "floor": lfloor,
            "node_id": rnode_id,
            "x": lx,
            "y": ly,
            "department": ldept,
            "aliases": laliases,
            "accessible": True,
            "description": ldesc
        })

    # ==========================================
    # FLOOR 1 — FIRST FLOOR
    # ==========================================
    f1_corridors = [
        ("N_1_S_W", "First Floor South-West Junction (Central Library)", "intersection", 215, 880),
        ("N_1_S_129", "First Floor South Corridor near E&C Lab-5", "corridor", 440, 880),
        ("N_1_S_128", "First Floor South Corridor near E&C Lab-4", "corridor", 590, 880),
        ("N_1_S_126", "First Floor South Corridor near E&C Lab-3", "corridor", 740, 880),
        ("N_1_S_E", "First Floor South-East Corridor Junction", "intersection", 900, 880),

        ("N_1_W_LIB", "First Floor West Corridor Library Entrance", "corridor", 215, 800),
        ("N_1_W_LIFT", "First Floor West Corridor Lift Foyer (Accessible)", "intersection", 215, 670),
        ("N_1_W_136", "First Floor West Corridor Study Space 136", "corridor", 215, 600),
        ("N_1_W_MID", "First Floor West Corridor Central Junction", "intersection", 215, 480),
        ("N_1_W_116", "First Floor West Corridor Lecture Hall 116", "corridor", 215, 340),
        ("N_1_W_N", "First Floor North-West Corridor Junction", "intersection", 215, 190),

        ("N_1_N_CAED", "First Floor North Corridor CAED Lab 112", "corridor", 410, 190),
        ("N_1_N_FACULTY", "First Floor North Corridor Faculty 111", "corridor", 580, 190),
        ("N_1_N_MBA_CLASS", "First Floor North Corridor MBA Class 110", "corridor", 670, 190),
        ("N_1_N_MBA_OFFICE", "First Floor North Corridor MBA Office 109", "corridor", 760, 190),
        ("N_1_N_E", "First Floor North-East Corridor Junction", "intersection", 900, 190),

        ("N_1_E_MBA102", "First Floor East Corridor MBA CR 102", "corridor", 900, 285),
        ("N_1_E_MBA103", "First Floor East Corridor MBA CR 103", "corridor", 900, 360),
        ("N_1_E_MID", "First Floor East Corridor Central Junction", "intersection", 800, 480),
        ("N_1_E_STAFF", "First Floor East Corridor E&C Staff Room", "corridor", 800, 615),
        ("N_1_E_LAB1", "First Floor East Corridor E&C Lab-1", "corridor", 800, 730),

        ("N_1_C_MID", "First Floor Central Atrium Crossroads", "intersection", 500, 480),
        ("N_1_C_STAIR_A", "First Floor Corridor near Staircase A", "intersection", 420, 440),
        ("N_1_C_STAIR_B", "First Floor Corridor near Staircase B", "intersection", 660, 480),
        ("N_1_C_STAIR_C", "First Floor Corridor near Staircase C & E&C Lab-8", "intersection", 350, 660),
        ("N_1_C_STUDY133", "First Floor Corridor Study 133 & E&C Lab-6", "corridor", 500, 675),
    ]
    for cid, cname, ctype, cx, cy in f1_corridors:
        nodes.append({"id": cid, "name": cname, "type": ctype, "floor": 1, "x": cx, "y": cy, "accessible": True})

    add_edge("N_1_S_W", "N_1_S_129")
    add_edge("N_1_S_129", "N_1_S_128")
    add_edge("N_1_S_128", "N_1_S_126")
    add_edge("N_1_S_126", "N_1_S_E")

    add_edge("N_1_S_W", "N_1_W_LIB")
    add_edge("N_1_W_LIB", "N_1_W_LIFT")
    add_edge("N_1_W_LIFT", "N_1_W_136")
    add_edge("N_1_W_136", "N_1_W_MID")
    add_edge("N_1_W_MID", "N_1_W_116")
    add_edge("N_1_W_116", "N_1_W_N")

    add_edge("N_1_W_N", "N_1_N_CAED")
    add_edge("N_1_N_CAED", "N_1_N_FACULTY")
    add_edge("N_1_N_FACULTY", "N_1_N_MBA_CLASS")
    add_edge("N_1_N_MBA_CLASS", "N_1_N_MBA_OFFICE")
    add_edge("N_1_N_MBA_OFFICE", "N_1_N_E")

    add_edge("N_1_N_E", "N_1_E_MBA102")
    add_edge("N_1_E_MBA102", "N_1_E_MBA103")
    add_edge("N_1_E_MBA103", "N_1_E_MID")
    add_edge("N_1_E_MID", "N_1_E_STAFF")
    add_edge("N_1_E_STAFF", "N_1_E_LAB1")
    add_edge("N_1_E_LAB1", "N_1_S_E")

    add_edge("N_1_W_MID", "N_1_C_STAIR_A")
    add_edge("N_1_C_STAIR_A", "N_1_C_MID")
    add_edge("N_1_C_MID", "N_1_C_STAIR_B")
    add_edge("N_1_C_STAIR_B", "N_1_E_MID")

    add_edge("N_1_N_FACULTY", "N_1_C_MID")
    add_edge("N_1_C_MID", "N_1_C_STUDY133")
    add_edge("N_1_C_STUDY133", "N_1_S_128")

    # Connect Stairs & Lifts on Floor 1
    add_edge("ELEV_1_1", "N_1_W_LIFT", distance=5.0)
    add_edge("STAIR_A_1", "N_1_C_STAIR_A", distance=8.0)
    add_edge("STAIR_B_1", "N_1_C_STAIR_B", distance=6.0)
    add_edge("STAIR_C_1", "N_1_C_STAIR_C", distance=8.0)
    add_edge("N_1_C_STAIR_C", "N_1_W_LIFT", distance=25.0)
    add_edge("N_1_C_STAIR_C", "N_1_C_STUDY133", distance=28.0)
    add_edge("STAIR_D_1", "N_1_S_129", distance=6.0)
    add_edge("STAIR_LIB_1", "N_1_W_LIB", distance=15.0)

    f1_rooms = [
        ("LOC_1_MBA_DIR", "MBA Director's Chamber (Room 101)", "office", 1, 840, 190, "Management Studies", ["mba director", "mba hod", "room 101", "101"], "First floor north-east corner", "N_1_N_E"),
        ("LOC_1_MBA_CR_102", "MBA Classroom 102", "classroom", 1, 820, 285, "Management Studies", ["mba cr 102", "mba 102", "room 102", "102"], "First floor east wing", "N_1_E_MBA102"),
        ("LOC_1_MBA_CR_103", "MBA Classroom 103", "classroom", 1, 820, 360, "Management Studies", ["mba cr 103", "mba 103", "room 103", "103"], "First floor east wing", "N_1_E_MBA103"),
        ("LOC_1_MEET_106", "Faculty Conference Room 106", "room", 1, 740, 465, "Management Studies", ["room 106", "meeting 106", "106"], "First floor central east wing", "N_1_C_STAIR_B"),
        ("LOC_1_STUDY_107", "Study Space 107", "study_area", 1, 590, 440, "Campus Common", ["study space 107", "study 107", "107"], "Near Staircase B and electrical room", "N_1_C_STAIR_B"),
        ("LOC_1_MBA_LIB", "MBA Departmental Library (Room 109)", "library", 1, 480, 320, "Management Studies", ["mba library", "management library", "room 109", "109"], "North central wing adjacent to Courtyard 3", "N_1_C_STAIR_A"),
        ("LOC_1_MBA_OFFICE", "MBA Department Office", "office", 1, 760, 190, "Management Studies", ["mba office", "business school office", "mba admin"], "North corridor", "N_1_N_MBA_OFFICE"),
        ("LOC_1_MBA_CLASS", "MBA Lecture Classroom 110", "classroom", 1, 670, 190, "Management Studies", ["room 110", "mba class 110", "110"], "North corridor", "N_1_N_MBA_CLASS"),
        ("LOC_1_FACULTY_111", "Faculty Cabins 111", "office", 1, 580, 190, "Faculty", ["faculty cabins", "staff room 111", "room 111", "111"], "North corridor", "N_1_N_FACULTY"),
        ("LOC_1_CAED_LAB", "CAED Computer Lab (Room 112)", "lab", 1, 410, 190, "Mechanical", ["caed lab", "cad lab", "computer aided engineering drawing", "room 112", "112"], "North wing large computer laboratory", "N_1_N_CAED"),
        ("LOC_1_LADIES_ROOM", "Ladies Common Lounge (Room 113)", "lounge", 1, 240, 190, "Student Welfare", ["ladies room", "ladies lounge", "girls common room", "room 113", "113"], "North-west wing", "N_1_W_N"),
        ("LOC_1_LECTURE_116", "Lecture Hall 116", "classroom", 1, 140, 340, "Lecture Halls", ["lecture hall 116", "lh 116", "room 116", "116"], "West corridor large lecture hall", "N_1_W_116"),
        ("LOC_1_ELEC_PANEL", "Electrical Panel Room 118", "room", 1, 510, 480, "Services", ["electrical panel", "substation control", "room 118", "118"], "Central utility zone", "N_1_C_MID"),
        ("LOC_1_STUDY_119", "Study Space 119", "study_area", 1, 510, 590, "Campus Common", ["study space 119", "study 119", "119"], "Central atrium study mezzanine", "N_1_C_STUDY133"),
        ("LOC_1_STAFF_ROOM", "E&C Department Staff Room", "office", 1, 720, 615, "Electronics & Comm", ["ec staff room", "ece faculty", "electronics staff room"], "East corridor academic section", "N_1_E_STAFF"),
        ("LOC_1_EC_LAB_1", "E & C Lab-1 (Room 122)", "lab", 1, 855, 730, "Electronics & Comm", ["ec lab 1", "ece lab 1", "circuits lab", "room 122", "122"], "East wing laboratory", "N_1_E_LAB1"),
        ("LOC_1_EC_LAB_2", "E & C Lab-2 (Room 125)", "lab", 1, 880, 880, "Electronics & Comm", ["ec lab 2", "ece lab 2", "analog electronics lab", "room 125", "125"], "South-east corner laboratory", "N_1_S_E"),
        ("LOC_1_EC_LAB_3", "E & C Lab-3 (Room 126)", "lab", 1, 740, 880, "Electronics & Comm", ["ec lab 3", "ece lab 3", "digital electronics lab", "room 126", "126"], "South corridor laboratory", "N_1_S_126"),
        ("LOC_1_EC_LAB_4", "E & C Lab-4 (Room 128)", "lab", 1, 590, 880, "Electronics & Comm", ["ec lab 4", "ece lab 4", "microcontroller lab", "room 128", "128"], "South corridor laboratory", "N_1_S_128"),
        ("LOC_1_EC_LAB_5", "E & C Lab-5 (Room 129)", "lab", 1, 440, 880, "Electronics & Comm", ["ec lab 5", "ece lab 5", "vlsi lab", "room 129", "129"], "South corridor laboratory near Staircase D", "N_1_S_129"),
        ("LOC_1_EC_LAB_6", "E & C Lab-6 (Room 130/131)", "lab", 1, 485, 760, "Electronics & Comm", ["ec lab 6", "ece lab 6", "communication lab", "room 130", "130", "131"], "Center south laboratory", "N_1_C_STUDY133"),
        ("LOC_1_EC_LAB_7", "E & C Lab-7 (Room 132)", "lab", 1, 485, 665, "Electronics & Comm", ["ec lab 7", "ece lab 7", "dsp lab", "room 132", "132"], "Center wing laboratory", "N_1_C_STUDY133"),
        ("LOC_1_EC_LAB_8", "E & C Lab-8 (Room 134)", "lab", 1, 385, 665, "Electronics & Comm", ["ec lab 8", "ece lab 8", "embedded lab", "room 134", "134"], "Center west laboratory near Staircase C", "N_1_C_STAIR_C"),
        ("LOC_1_STUDY_133", "Study Space 133", "study_area", 1, 590, 675, "Campus Common", ["study space 133", "study 133", "133"], "Courtyard 1 perimeter study deck", "N_1_C_STUDY133"),
        ("LOC_1_LIB_MAIN", "Central Library (Primary Floor) (Room 135)", "library", 1, 235, 800, "Library", ["central library", "library", "library pf", "reading room", "reference section", "room 135", "135"], "Main entry to central library, first floor west wing", "N_1_W_LIB"),
        ("LOC_1_STUDY_136", "Study Space 136", "study_area", 1, 240, 600, "Campus Common", ["study space 136", "study 136", "136"], "West corridor study alcove", "N_1_W_136"),
        ("LOC_1_LECTURE_137", "Lecture Hall 137", "classroom", 1, 140, 670, "Lecture Halls", ["lecture hall 137", "lh 137", "room 137", "137"], "West corridor lecture theater", "N_1_W_LIFT"),
        ("LOC_1_SEMINAR_AUD", "Campus Auditorium (Red Seminar Hall)", "hall", 1, 330, 460, "Auditorium", ["auditorium", "seminar hall", "red hall", "main auditorium", "audi"], "Central tiered auditorium between Courtyard 2 & 3", "N_1_C_STAIR_A"),
        ("LOC_1_WORKSHOP_138", "Workshop 1st Floor - CAD & Simulation (Room 138)", "workshop", 1, 350, 80, "Mechanical", ["workshop 138", "cad simulation", "room 138", "138"], "Workshop first floor wing", "STAIR_WS_1"),
        ("LOC_1_WORKSHOP_139", "Workshop 1st Floor - Drafting Studio (Room 139)", "workshop", 1, 180, 80, "Mechanical", ["workshop 139", "drafting studio", "room 139", "139"], "Workshop first floor wing", "STAIR_WS_1"),
    ]

    for lid, lname, ltype, lfloor, lx, ly, ldept, laliases, ldesc, lconn in f1_rooms:
        rnode_id = f"RN_{lid}"
        nodes.append({"id": rnode_id, "name": lname, "type": "room", "floor": lfloor, "x": lx, "y": ly, "accessible": True})
        add_edge(rnode_id, lconn, distance=5.0)
        locations.append({
            "id": lid,
            "name": lname,
            "type": ltype,
            "floor": lfloor,
            "node_id": rnode_id,
            "x": lx,
            "y": ly,
            "department": ldept,
            "aliases": laliases,
            "accessible": True,
            "description": ldesc
        })

    # ==========================================
    # FLOOR 2 — SECOND FLOOR (KEY SHOWCASE FLOOR!)
    # ==========================================
    f2_corridors = [
        ("N_2_S_W", "Second Floor South-West Junction (Library SF)", "intersection", 215, 880),
        ("N_2_S_233", "Second Floor South Corridor near IS Lab-5", "corridor", 430, 880),
        ("N_2_S_232", "Second Floor South Corridor near IS Lab-4", "corridor", 550, 880),
        ("N_2_S_231", "Second Floor South Corridor near Server Room", "corridor", 635, 880),
        ("N_2_S_230", "Second Floor South Corridor near IS Lab-3", "corridor", 700, 880),
        ("N_2_S_E", "Second Floor South-East Corridor Junction", "intersection", 900, 880),

        ("N_2_W_LIB", "Second Floor Library SF Entrance", "corridor", 215, 800),
        ("N_2_W_LIFT", "Second Floor West Corridor Lift Foyer (Accessible)", "intersection", 215, 670),
        ("N_2_W_CHEM", "Second Floor West Corridor Chemistry Lab", "corridor", 215, 550),
        ("N_2_W_MID", "Second Floor West Corridor Central Junction", "intersection", 215, 480),
        ("N_2_W_PHYSICS", "Second Floor West Corridor Physics Lab", "corridor", 215, 370),
        ("N_2_W_LOUNGE", "Second Floor Student Lounge 216 & Bridge", "intersection", 215, 220),
        ("N_2_W_N", "Second Floor North-West Corridor Junction", "intersection", 215, 190),

        ("N_2_N_214", "Second Floor North Corridor - Room 214 (Faculty Dept)", "corridor", 380, 190),
        ("N_2_N_213", "Second Floor North Corridor - Mathematics Dept 213", "corridor", 480, 190),
        ("N_2_N_211", "Second Floor North Corridor - Engineering CR 211", "corridor", 670, 190),
        ("N_2_N_201", "Second Floor North Corridor - Faculty 201", "corridor", 820, 190),
        ("N_2_N_E", "Second Floor North-East Corridor Junction", "intersection", 900, 190),

        ("N_2_E_MBA202", "Second Floor East Corridor MBA CR 202", "corridor", 900, 285),
        ("N_2_E_MBA203", "Second Floor East Corridor MBA CR 203", "corridor", 900, 360),
        ("N_2_E_MID", "Second Floor East Corridor Central Junction", "intersection", 800, 480),
        ("N_2_E_STAFF", "Second Floor East Corridor CS Staff & HOD", "corridor", 800, 610),
        ("N_2_E_CS_CR", "Second Floor East Corridor CS CR 226", "corridor", 800, 740),

        ("N_2_C_MID", "Second Floor Central Atrium Crossroads", "intersection", 500, 480),
        ("N_2_C_STAIR_A", "Second Floor Corridor near Staircase A", "intersection", 420, 440),
        ("N_2_C_STAIR_B", "Second Floor Corridor near Staircase B", "intersection", 660, 480),
        ("N_2_C_STAIR_C", "Second Floor Corridor near Staircase C & CS CR 236", "intersection", 350, 660),
        ("N_2_C_STUDY237", "Second Floor Corridor Study 237 & CS Lab", "corridor", 500, 675),
    ]
    for cid, cname, ctype, cx, cy in f2_corridors:
        nodes.append({"id": cid, "name": cname, "type": ctype, "floor": 2, "x": cx, "y": cy, "accessible": True})

    add_edge("N_2_S_W", "N_2_S_233")
    add_edge("N_2_S_233", "N_2_S_232")
    add_edge("N_2_S_232", "N_2_S_231")
    add_edge("N_2_S_231", "N_2_S_230")
    add_edge("N_2_S_230", "N_2_S_E")

    add_edge("N_2_S_W", "N_2_W_LIB")
    add_edge("N_2_W_LIB", "N_2_W_LIFT")
    add_edge("N_2_W_LIFT", "N_2_W_CHEM")
    add_edge("N_2_W_CHEM", "N_2_W_MID")
    add_edge("N_2_W_MID", "N_2_W_PHYSICS")
    add_edge("N_2_W_PHYSICS", "N_2_W_LOUNGE")
    add_edge("N_2_W_LOUNGE", "N_2_W_N")

    add_edge("N_2_W_N", "N_2_N_214")
    add_edge("N_2_N_214", "N_2_N_213")
    add_edge("N_2_N_213", "N_2_N_211")
    add_edge("N_2_N_211", "N_2_N_201")
    add_edge("N_2_N_201", "N_2_N_E")

    add_edge("N_2_N_E", "N_2_E_MBA202")
    add_edge("N_2_E_MBA202", "N_2_E_MBA203")
    add_edge("N_2_E_MBA203", "N_2_E_MID")
    add_edge("N_2_E_MID", "N_2_E_STAFF")
    add_edge("N_2_E_STAFF", "N_2_E_CS_CR")
    add_edge("N_2_E_CS_CR", "N_2_S_E")

    add_edge("N_2_W_MID", "N_2_C_STAIR_A")
    add_edge("N_2_C_STAIR_A", "N_2_C_MID")
    add_edge("N_2_C_MID", "N_2_C_STAIR_B")
    add_edge("N_2_C_STAIR_B", "N_2_E_MID")

    add_edge("N_2_N_213", "N_2_C_MID")
    add_edge("N_2_C_MID", "N_2_C_STUDY237")
    add_edge("N_2_C_STUDY237", "N_2_S_232")

    # Connect Stairs & Lifts on Floor 2
    add_edge("ELEV_1_2", "N_2_W_LIFT", distance=5.0)
    add_edge("STAIR_A_2", "N_2_C_STAIR_A", distance=8.0)
    add_edge("STAIR_B_2", "N_2_C_STAIR_B", distance=6.0)
    add_edge("STAIR_C_2", "N_2_C_STAIR_C", distance=8.0)
    add_edge("N_2_C_STAIR_C", "N_2_W_LIFT", distance=25.0)
    add_edge("N_2_C_STAIR_C", "N_2_C_STUDY237", distance=28.0)
    add_edge("STAIR_D_2", "N_2_S_233", distance=6.0)
    add_edge("STAIR_LIB_2", "N_2_W_LIB", distance=15.0)

    # Workshop Bridge from Floor 2 Student Lounge (x=215, y=220) to Workshop (x=285, y=150) -> Workshop Floor 2
    nodes.append({"id": "N_2_WS_BRIDGE", "name": "Skybridge to Workshop (Floor 2)", "type": "corridor", "floor": 2, "x": 285, "y": 150, "accessible": True})
    add_edge("N_2_W_LOUNGE", "N_2_WS_BRIDGE", distance=18.0, difficulty=1, turn_complexity=1, notes="Enclosed skybridge walkway")
    add_edge("N_2_WS_BRIDGE", "STAIR_WS_2", distance=25.0, notes="Access to Workshop 2nd floor labs")

    f2_rooms = [
        # THE PRIMARY DESTINATION
        ("R214", "Room 214 (Faculty Department)", "room", 2, 380, 190, "Faculty", ["room 214", "214", "faculty department", "faculty dept", "room214", "faculty 214", "faculty room 214"], "2nd Floor, north corridor near Mathematics Dept", "N_2_N_214"),
        ("LOC_2_MATH_DEPT", "Mathematics Department (Room 213)", "department", 2, 480, 190, "Mathematics", ["mathematics dept", "maths dept", "mathematics", "room 213", "213"], "2nd Floor, north corridor next to Room 214", "N_2_N_213"),
        ("LOC_2_ENG_CR_211", "Engineering Classroom 211", "classroom", 2, 670, 190, "Engineering", ["eng cr 211", "room 211", "classroom 211", "211"], "2nd Floor, north corridor", "N_2_N_211"),
        ("LOC_2_FACULTY_201", "Faculty Cabins 201", "office", 2, 820, 190, "Faculty", ["faculty 201", "room 201", "201"], "2nd Floor, north-east corner", "N_2_N_201"),
        ("LOC_2_STUDENT_LOUNGE", "Student Lounge (Room 216)", "lounge", 2, 235, 220, "Student Welfare", ["student lounge", "recreation lounge", "room 216", "216"], "2nd Floor, north-west wing at Workshop Bridge", "N_2_W_LOUNGE"),
        ("LOC_2_SPORTS", "Sports Gallery & Activities (Room 217)", "room", 2, 135, 220, "Physical Education", ["sports room", "sports gallery", "gym office", "room 217", "217"], "2nd Floor, west wing", "N_2_W_LOUNGE"),
        ("LOC_2_PHYSICS_LAB", "Physics Laboratory", "lab", 2, 140, 370, "Basic Sciences", ["physics lab", "engineering physics lab", "physics laboratory", "optics lab"], "2nd Floor, long west corridor lab", "N_2_W_PHYSICS"),
        ("LOC_2_CHEMISTRY_LAB", "Chemistry Laboratory", "lab", 2, 140, 550, "Basic Sciences", ["chemistry lab", "engineering chemistry lab", "chemical science"], "2nd Floor, long west corridor lab", "N_2_W_CHEM"),
        ("LOC_2_DRAWING_219", "Drawing & CAD Studio (Room 219)", "room", 2, 330, 460, "Engineering", ["drawing room 219", "studio 219", "room 219", "219"], "2nd Floor central hall facing Courtyard 2", "N_2_C_STAIR_A"),
        ("LOC_2_INTEL_LAB", "Intel Intelligence & AI Lab (Room 220)", "lab", 2, 505, 470, "Computer Science", ["intel lab", "intel intelligence lab", "ai lab", "room 220", "220"], "2nd Floor central corridor research lab", "N_2_C_MID"),
        ("LOC_2_STUDY_207", "Study Space 207", "study_area", 2, 590, 450, "Campus Common", ["study space 207", "study 207", "207"], "Near Staircase B and IS Classroom", "N_2_C_STAIR_B"),
        ("LOC_2_IS_CR_206", "Information Science Classroom 206", "classroom", 2, 725, 465, "Information Science", ["is cr 206", "ise classroom", "room 206", "206"], "2nd Floor central-east wing", "N_2_C_STAIR_B"),
        ("LOC_2_RESTROOM_204", "Restrooms 204/205", "restroom", 2, 865, 465, "Services", ["restroom 2nd floor", "toilet 2nd floor", "room 204", "room 205", "204", "205"], "2nd Floor east wing restrooms", "N_2_E_MID"),
        ("LOC_2_MBA_CR_202", "MBA Classroom 202", "classroom", 2, 825, 285, "Management Studies", ["mba 202", "cr 202", "room 202", "202"], "2nd Floor east corridor", "N_2_E_MBA202"),
        ("LOC_2_MBA_CR_203", "MBA Classroom 203", "classroom", 2, 825, 360, "Management Studies", ["mba 203", "cr 203", "room 203", "203"], "2nd Floor east corridor", "N_2_E_MBA203"),
        ("LOC_2_CIVIL_DEPT_209", "Civil & Structural Dept (Room 209)", "department", 2, 485, 320, "Civil Engineering", ["civil dept", "civil engineering", "structural dept", "room 209", "209"], "North-central wing between Courtyard 3 & 4", "N_2_C_STAIR_A"),
        ("LOC_2_STUDY_221", "Study Space 221", "study_area", 2, 510, 590, "Campus Common", ["study space 221", "study 221", "221"], "Central atrium mezzanine", "N_2_C_STUDY237"),
        ("LOC_2_STAFF_224", "Computer Science Staff Room (Room 224)", "office", 2, 720, 610, "Computer Science", ["cs staff room", "cse faculty 224", "room 224", "224"], "East corridor staff room", "N_2_E_STAFF"),
        ("LOC_2_CS_LAB_225", "CS Programming Lab 225", "lab", 2, 855, 670, "Computer Science", ["cs lab 225", "programming lab 225", "room 225", "225"], "East corridor computer lab", "N_2_E_STAFF"),
        ("LOC_2_CS_CR_226", "CS Classroom 226", "classroom", 2, 855, 740, "Computer Science", ["cs cr 226", "cse 226", "room 226", "226"], "East corridor classroom", "N_2_E_CS_CR"),
        ("LOC_2_IS_LAB_2", "Information Science Lab-2 (Room 228)", "lab", 2, 830, 880, "Information Science", ["is lab 2", "ise lab 2", "room 228", "228"], "South-east wing lab", "N_2_S_E"),
        ("LOC_2_IS_LAB_3", "Information Science Lab-3 (Room 230)", "lab", 2, 700, 880, "Information Science", ["is lab 3", "ise lab 3", "room 230", "230"], "South corridor lab", "N_2_S_230"),
        ("LOC_2_SERVER_231", "Campus Server & Network Operations (Room 231)", "room", 2, 635, 880, "IT Infrastructure", ["server room", "noc", "network room", "data center", "room 231", "231"], "South corridor IT center", "N_2_S_231"),
        ("LOC_2_IS_LAB_4", "Information Science Lab-4 (Room 232)", "lab", 2, 550, 880, "Information Science", ["is lab 4", "ise lab 4", "room 232", "232"], "South corridor lab", "N_2_S_232"),
        ("LOC_2_IS_LAB_5", "Information Science Lab-5 (Room 233)", "lab", 2, 430, 880, "Information Science", ["is lab 5", "ise lab 5", "room 233", "233"], "South corridor lab near Staircase D", "N_2_S_233"),
        ("LOC_2_CS_CR_236", "CS Classroom 236", "classroom", 2, 505, 665, "Computer Science", ["cs cr 236", "room 236", "236"], "Center-south classroom", "N_2_C_STAIR_C"),
        ("LOC_2_STUDY_237", "Study Space 237", "study_area", 2, 635, 675, "Campus Common", ["study space 237", "study 237", "237"], "Courtyard 1 perimeter study area", "N_2_C_STUDY237"),
        ("LOC_2_LIB_SF", "Central Library (Second Floor - SF) (Room 239)", "library", 2, 235, 800, "Library", ["library second floor", "library sf", "periodicals section", "digital library", "room 239", "239"], "Second floor library digital resources section", "N_2_W_LIB"),
        ("LOC_2_WORKSHOP_243", "Workshop Hands-on Lab-2 (Room 243)", "workshop", 2, 190, 80, "Mechanical", ["hands-on lab 2", "workshop 243", "room 243", "243"], "Workshop second floor", "STAIR_WS_2"),
        ("LOC_2_WORKSHOP_242", "Workshop Hands-on Lab-1 (Room 242)", "workshop", 2, 390, 80, "Mechanical", ["hands-on lab 1", "workshop 242", "room 242", "242"], "Workshop second floor", "STAIR_WS_2"),
    ]

    for lid, lname, ltype, lfloor, lx, ly, ldept, laliases, ldesc, lconn in f2_rooms:
        rnode_id = f"RN_{lid}"
        nodes.append({"id": rnode_id, "name": lname, "type": "room", "floor": lfloor, "x": lx, "y": ly, "accessible": True})
        add_edge(rnode_id, lconn, distance=5.0)
        locations.append({
            "id": lid,
            "name": lname,
            "type": ltype,
            "floor": lfloor,
            "node_id": rnode_id,
            "x": lx,
            "y": ly,
            "department": ldept,
            "aliases": laliases,
            "accessible": True,
            "description": ldesc
        })

    # ==========================================
    # FLOOR 3 — THIRD FLOOR
    # ==========================================
    f3_corridors = [
        ("N_3_S_W", "Third Floor South-West Junction (Terrace Pool)", "intersection", 215, 880),
        ("N_3_S_337", "Third Floor South Corridor CR 337", "corridor", 420, 880),
        ("N_3_S_339", "Third Floor South Corridor IS CR 339", "corridor", 570, 880),
        ("N_3_S_E", "Third Floor South-East Corridor Junction", "intersection", 900, 880),

        ("N_3_W_TERRACE", "Third Floor Terrace Entrance", "corridor", 215, 800),
        ("N_3_W_LIFT", "Third Floor West Corridor Lift Foyer (Accessible)", "intersection", 215, 670),
        ("N_3_W_MID", "Third Floor West Corridor Central Junction", "intersection", 215, 480),
        ("N_3_W_N", "Third Floor North-West Corridor Junction", "intersection", 215, 190),

        ("N_3_N_316", "Third Floor North Corridor Civil CR 316", "corridor", 240, 190),
        ("N_3_N_318", "Third Floor North Corridor Class 318", "corridor", 360, 190),
        ("N_3_N_STAFF", "Third Floor North Corridor Civil Staff Room", "corridor", 680, 190),
        ("N_3_N_E", "Third Floor North-East Corridor Junction", "intersection", 900, 190),

        ("N_3_E_301", "Third Floor East Corridor Civil CR 301", "corridor", 900, 285),
        ("N_3_E_302", "Third Floor East Corridor Civil CR 302", "corridor", 900, 375),
        ("N_3_E_MID", "Third Floor East Corridor Central Junction", "intersection", 800, 480),
        ("N_3_E_CAD", "Third Floor East Corridor Civil CAD Lab", "corridor", 800, 610),

        ("N_3_C_MID", "Third Floor Central Crossroads", "intersection", 500, 480),
        ("N_3_C_STAIR_A", "Third Floor Corridor near Staircase A", "intersection", 420, 440),
        ("N_3_C_STAIR_B", "Third Floor Corridor near Staircase B", "intersection", 660, 480),
        ("N_3_C_STAIR_C", "Third Floor Corridor near Staircase C", "intersection", 350, 660),
    ]
    for cid, cname, ctype, cx, cy in f3_corridors:
        nodes.append({"id": cid, "name": cname, "type": ctype, "floor": 3, "x": cx, "y": cy, "accessible": True})

    add_edge("N_3_S_W", "N_3_S_337")
    add_edge("N_3_S_337", "N_3_S_339")
    add_edge("N_3_S_339", "N_3_S_E")

    add_edge("N_3_S_W", "N_3_W_TERRACE")
    add_edge("N_3_W_TERRACE", "N_3_W_LIFT")
    add_edge("N_3_W_LIFT", "N_3_W_MID")
    add_edge("N_3_W_MID", "N_3_W_N")

    add_edge("N_3_W_N", "N_3_N_316")
    add_edge("N_3_N_316", "N_3_N_318")
    add_edge("N_3_N_318", "N_3_N_STAFF")
    add_edge("N_3_N_STAFF", "N_3_N_E")

    add_edge("N_3_N_E", "N_3_E_301")
    add_edge("N_3_E_301", "N_3_E_302")
    add_edge("N_3_E_302", "N_3_E_MID")
    add_edge("N_3_E_MID", "N_3_E_CAD")
    add_edge("N_3_E_CAD", "N_3_S_E")

    add_edge("N_3_W_MID", "N_3_C_STAIR_A")
    add_edge("N_3_C_STAIR_A", "N_3_C_MID")
    add_edge("N_3_C_MID", "N_3_C_STAIR_B")
    add_edge("N_3_C_STAIR_B", "N_3_E_MID")

    # Connect Stairs & Lifts on Floor 3
    add_edge("ELEV_1_3", "N_3_W_LIFT", distance=5.0)
    add_edge("STAIR_A_3", "N_3_C_STAIR_A", distance=8.0)
    add_edge("STAIR_B_3", "N_3_C_STAIR_B", distance=6.0)
    add_edge("STAIR_C_3", "N_3_C_STAIR_C", distance=8.0)
    add_edge("N_3_C_STAIR_C", "N_3_W_LIFT", distance=25.0)
    add_edge("STAIR_D_3", "N_3_S_337", distance=6.0)

    f3_rooms = [
        ("LOC_3_CIVIL_CR_316", "Civil Classroom 316", "classroom", 3, 240, 190, "Civil Engineering", ["civil cr 316", "room 316", "316"], "3rd Floor north-west wing", "N_3_N_316"),
        ("LOC_3_CR_318", "Classroom 318", "classroom", 3, 360, 190, "Engineering", ["room 318", "cr 318", "318"], "3rd Floor north wing", "N_3_N_318"),
        ("LOC_3_CIVIL_STAFF", "Civil Engineering Staff Room", "office", 3, 680, 190, "Civil Engineering", ["civil staff", "civil faculty", "civil staff room"], "3rd Floor north wing", "N_3_N_STAFF"),
        ("LOC_3_CIVIL_CR_301", "Civil Classroom 301", "classroom", 3, 840, 285, "Civil Engineering", ["civil 301", "cr 301", "room 301", "301"], "3rd Floor east wing", "N_3_E_301"),
        ("LOC_3_CIVIL_CR_302", "Civil Classroom 302", "classroom", 3, 840, 375, "Civil Engineering", ["civil 302", "cr 302", "room 302", "302"], "3rd Floor east wing", "N_3_E_302"),
        ("LOC_3_ENV_LAB", "Environmental Engineering Lab (Room 321)", "lab", 3, 330, 460, "Civil Engineering", ["environmental lab", "env lab 221", "env lab 321", "room 321", "321"], "3rd Floor central laboratory", "N_3_C_STAIR_A"),
        ("LOC_3_TRAINING", "Training & Placement Cell (Room 334)", "office", 3, 510, 480, "Career Services", ["training cell", "placement training", "room 334", "334"], "3rd Floor central wing", "N_3_C_MID"),
        ("LOC_3_CIVIL_CAD", "Civil CAD Lab-1", "lab", 3, 750, 610, "Civil Engineering", ["civil cad lab", "civil lab 1", "structural analysis lab"], "3rd Floor east wing", "N_3_E_CAD"),
        ("LOC_3_CR_337", "Classroom 337", "classroom", 3, 420, 880, "Classrooms", ["room 337", "cr 337", "337"], "3rd Floor south corridor", "N_3_S_337"),
        ("LOC_3_IS_CR_339", "Information Science Classroom 339", "classroom", 3, 570, 880, "Information Science", ["room 339", "is cr 339", "339"], "3rd Floor south corridor", "N_3_S_339"),
        ("LOC_3_ROOF_POOL", "Open-Air Water Feature & Terrace (Room 345)", "lounge", 3, 220, 800, "Campus Common", ["pool", "terrace", "roof pool", "water feature", "room 345", "345"], "3rd Floor south-west scenic terrace", "N_3_W_TERRACE"),
    ]
    for lid, lname, ltype, lfloor, lx, ly, ldept, laliases, ldesc, lconn in f3_rooms:
        rnode_id = f"RN_{lid}"
        nodes.append({"id": rnode_id, "name": lname, "type": "room", "floor": lfloor, "x": lx, "y": ly, "accessible": True})
        add_edge(rnode_id, lconn, distance=5.0)
        locations.append({
            "id": lid,
            "name": lname,
            "type": ltype,
            "floor": lfloor,
            "node_id": rnode_id,
            "x": lx,
            "y": ly,
            "department": ldept,
            "aliases": laliases,
            "accessible": True,
            "description": ldesc
        })

    # ==========================================
    # FLOOR 4 — FOURTH FLOOR
    # ==========================================
    f4_corridors = [
        ("N_4_N_W", "Fourth Floor North-West Corridor Junction", "intersection", 215, 190),
        ("N_4_N_411", "Fourth Floor North Corridor E&C Lab-4", "corridor", 360, 190),
        ("N_4_N_410", "Fourth Floor North Corridor E&C Lab-5", "corridor", 460, 190),
        ("N_4_N_408", "Fourth Floor North Corridor E&C Lab-3", "corridor", 650, 190),
        ("N_4_N_SPSS", "Fourth Floor North Corridor SPSS Lab 409", "corridor", 740, 190),
        ("N_4_N_E", "Fourth Floor North-East Corridor Junction", "intersection", 900, 190),

        ("N_4_E_ENG", "Fourth Floor East Corridor E&C Engineering", "corridor", 830, 350),
        ("N_4_E_MID", "Fourth Floor East Corridor Central Junction", "intersection", 800, 465),

        ("N_4_C_MID", "Fourth Floor Central Crossroads", "intersection", 500, 460),
        ("N_4_C_STAIR_B", "Fourth Floor Corridor near Staircase B", "intersection", 660, 460),

        ("N_4_W_LIFT", "Fourth Floor West Corridor Lift Foyer (Accessible)", "intersection", 215, 460),
        ("N_4_TERRACE", "Fourth Floor Rooftop Garden Promenade", "corridor", 500, 650),
    ]
    for cid, cname, ctype, cx, cy in f4_corridors:
        nodes.append({"id": cid, "name": cname, "type": ctype, "floor": 4, "x": cx, "y": cy, "accessible": True})

    add_edge("N_4_N_W", "N_4_N_411")
    add_edge("N_4_N_411", "N_4_N_410")
    add_edge("N_4_N_410", "N_4_N_408")
    add_edge("N_4_N_408", "N_4_N_SPSS")
    add_edge("N_4_N_SPSS", "N_4_N_E")

    add_edge("N_4_N_E", "N_4_E_ENG")
    add_edge("N_4_E_ENG", "N_4_E_MID")

    add_edge("N_4_N_W", "N_4_W_LIFT")
    add_edge("N_4_W_LIFT", "N_4_C_MID")
    add_edge("N_4_C_MID", "N_4_C_STAIR_B")
    add_edge("N_4_C_STAIR_B", "N_4_E_MID")
    add_edge("N_4_C_MID", "N_4_TERRACE")

    # Connect Stairs & Lifts on Floor 4
    add_edge("ELEV_1_4", "N_4_W_LIFT", distance=5.0)
    add_edge("STAIR_B_4", "N_4_C_STAIR_B", distance=6.0)

    f4_rooms = [
        ("LOC_4_EC_LAB_1", "E&C Communication Lab-1 (Room 401)", "lab", 4, 830, 190, "Electronics & Comm", ["ec lab 401", "room 401", "401"], "4th Floor north-east lab", "N_4_N_E"),
        ("LOC_4_SPSS", "SPSS Statistical Computing Lab (Room 409)", "lab", 4, 740, 190, "Analytics", ["spss lab", "data analytics lab", "room 409", "409"], "4th Floor computing lab", "N_4_N_SPSS"),
        ("LOC_4_EC_LAB_3", "E&C Microwave Lab-3 (Room 408)", "lab", 4, 650, 190, "Electronics & Comm", ["ec lab 408", "microwave lab", "room 408", "408"], "4th Floor lab", "N_4_N_408"),
        ("LOC_4_EC_LAB_5", "E&C VLSI Design Lab-5 (Room 410)", "lab", 4, 460, 190, "Electronics & Comm", ["ec lab 410", "vlsi design lab", "room 410", "410"], "4th Floor lab", "N_4_N_410"),
        ("LOC_4_EC_LAB_4", "E&C Signal Processing Lab-4 (Room 411)", "lab", 4, 360, 190, "Electronics & Comm", ["ec lab 411", "signal processing lab", "room 411", "411"], "4th Floor lab", "N_4_N_411"),
        ("LOC_4_DRESS_ROOM", "Common Room & Activity Center (Room 414)", "lounge", 4, 240, 190, "Student Welfare", ["common room 414", "dress common room", "room 414", "414"], "4th Floor north-west common lounge", "N_4_N_W"),
        ("LOC_4_EC_ENG", "E&C Engineering Hall", "hall", 4, 830, 350, "Electronics & Comm", ["ec engineering hall", "electronics hall", "seminar hall 4"], "4th Floor large departmental hall", "N_4_E_ENG"),
        ("LOC_4_STUDY_406", "Study Space 406", "study_area", 4, 590, 450, "Campus Common", ["study space 406", "study 406", "406"], "4th Floor study space near Staircase B", "N_4_C_STAIR_B"),
        ("LOC_4_TOILET_405", "Restrooms 404/405", "restroom", 4, 730, 465, "Services", ["restroom 4th floor", "toilets 4th floor", "room 405", "405"], "4th Floor restrooms", "N_4_E_MID"),
        ("LOC_4_ROOFTOP_GARDEN", "Sky Garden & Rooftop Terrace", "lounge", 4, 500, 750, "Campus Common", ["sky garden", "rooftop garden", "terrace garden", "4th floor terrace"], "4th Floor expansive landscaped open terrace", "N_4_TERRACE"),
        ("LOC_4_GUEST_HOUSE", "Campus Guest House (Room 415)", "room", 4, 290, 80, "Hospitality", ["guest house", "vip guest house", "room 415", "415"], "Workshop wing top level VIP suites", "STAIR_WS_4"),
    ]
    for lid, lname, ltype, lfloor, lx, ly, ldept, laliases, ldesc, lconn in f4_rooms:
        rnode_id = f"RN_{lid}"
        nodes.append({"id": rnode_id, "name": lname, "type": "room", "floor": lfloor, "x": lx, "y": ly, "accessible": True})
        add_edge(rnode_id, lconn, distance=5.0)
        locations.append({
            "id": lid,
            "name": lname,
            "type": ltype,
            "floor": lfloor,
            "node_id": rnode_id,
            "x": lx,
            "y": ly,
            "department": ldept,
            "aliases": laliases,
            "accessible": True,
            "description": ldesc
        })

    # ==========================================
    # FLOOR 5 — FIFTH FLOOR
    # ==========================================
    f5_corridors = [
        ("N_5_N_INCUBATION", "Fifth Floor Incubation Centre Foyer", "corridor", 600, 190),
        ("N_5_N_ENTREPRENEUR", "Fifth Floor E-Cell Corridor", "corridor", 760, 190),
        ("N_5_N_E", "Fifth Floor North-East Corridor Junction", "intersection", 870, 190),

        ("N_5_E_DREAMERS", "Fifth Floor Dreamers R&D Entrance", "corridor", 870, 320),
        ("N_5_E_MID", "Fifth Floor East Wing Restrooms Junction", "intersection", 870, 460),

        ("N_5_C_APTRA", "Fifth Floor Aptra Innovation Lab Foyer", "corridor", 480, 320),
        ("N_5_C_STAIR_B", "Fifth Floor Corridor near Staircase B", "intersection", 660, 460),
        ("N_5_W_LIFT", "Fifth Floor Lift Foyer (Accessible)", "intersection", 215, 460),
        ("N_5_TERRACE", "Fifth Floor Panoramic Riverview Promenade", "corridor", 500, 750),
    ]
    for cid, cname, ctype, cx, cy in f5_corridors:
        nodes.append({"id": cid, "name": cname, "type": ctype, "floor": 5, "x": cx, "y": cy, "accessible": True})

    add_edge("N_5_N_INCUBATION", "N_5_N_ENTREPRENEUR")
    add_edge("N_5_N_ENTREPRENEUR", "N_5_N_E")
    add_edge("N_5_N_E", "N_5_E_DREAMERS")
    add_edge("N_5_E_DREAMERS", "N_5_E_MID")

    add_edge("N_5_N_INCUBATION", "N_5_C_APTRA")
    add_edge("N_5_C_APTRA", "N_5_C_STAIR_B")
    add_edge("N_5_C_STAIR_B", "N_5_E_MID")
    add_edge("N_5_C_STAIR_B", "N_5_W_LIFT")
    add_edge("N_5_C_STAIR_B", "N_5_TERRACE")

    # Connect Stairs & Lifts on Floor 5
    add_edge("ELEV_1_5", "N_5_W_LIFT", distance=5.0)
    add_edge("STAIR_B_5", "N_5_C_STAIR_B", distance=6.0)

    f5_rooms = [
        ("LOC_5_DIRECTOR", "Executive Board & Director's Chamber (Room 501)", "office", 5, 870, 190, "Executive", ["board room 501", "director 501", "room 501", "501"], "Top floor executive suite", "N_5_N_E"),
        ("LOC_5_INCUBATION", "Sahyadri Center for Social Innovation & Incubation (Room 510)", "office", 5, 600, 190, "Incubation", ["incubation centre", "startup incubator", "scsii", "innovation centre", "room 510", "510"], "5th floor startup hub and entrepreneurship incubator", "N_5_N_INCUBATION"),
        ("LOC_5_ENTREPRENEUR", "Entrepreneurship Cell (E-Cell 211/511)", "office", 5, 760, 190, "Incubation", ["entrepreneurship cell", "e cell", "startup cell", "room 511", "511"], "5th floor venture accelerator", "N_5_N_ENTREPRENEUR"),
        ("LOC_5_DREAMERS", "Dreamers R&D Facility (Room 502)", "lab", 5, 870, 320, "Research & Dev", ["dreamers rd", "dreamers lab", "makerspace", "room 502", "502"], "5th floor advanced prototype studio", "N_5_E_DREAMERS"),
        ("LOC_5_APTRA", "Aptra Innovation Lab (Room 509)", "lab", 5, 480, 320, "Research & Dev", ["aptra", "aptra lab", "aptra innovation", "room 509", "509"], "5th floor technology accelerator", "N_5_C_APTRA"),
        ("LOC_5_RESTROOM_503", "Restrooms 503/504", "restroom", 5, 870, 460, "Services", ["restroom 5th floor", "toilet 503", "toilet 504", "503", "504"], "5th floor restrooms", "N_5_E_MID"),
        ("LOC_5_STUDY_506", "Rooftop Study Space (Room 506)", "study_area", 5, 590, 450, "Campus Common", ["study space 506", "rooftop study", "room 506", "506"], "5th floor quiet study area adjacent to Staircase B", "N_5_C_STAIR_B"),
        ("LOC_5_ROOFTOP_TERRACE", "Panoramic Riverview Rooftop Promenade", "lounge", 5, 500, 750, "Campus Common", ["riverview promenade", "rooftop terrace", "5th floor view", "viewpoint"], "5th floor rooftop overlook viewing the Netravati river", "N_5_TERRACE"),
    ]
    for lid, lname, ltype, lfloor, lx, ly, ldept, laliases, ldesc, lconn in f5_rooms:
        rnode_id = f"RN_{lid}"
        nodes.append({"id": rnode_id, "name": lname, "type": "room", "floor": lfloor, "x": lx, "y": ly, "accessible": True})
        add_edge(rnode_id, lconn, distance=5.0)
        locations.append({
            "id": lid,
            "name": lname,
            "type": ltype,
            "floor": lfloor,
            "node_id": rnode_id,
            "x": lx,
            "y": ly,
            "department": ldept,
            "aliases": laliases,
            "accessible": True,
            "description": ldesc
        })

    # ==========================================
    # QR CHECKPOINTS (Demo positioning markers)
    # ==========================================
    qr_data = [
        {"id": "QR-G-ENT-S", "code": "SAHYADRI_QR_G_ENT_S", "name": "Ground Floor · Main South Entrance", "floor": 0, "node_id": "N_G_S_ENT", "physical_location": "Main South Portico Security Pillar", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_G_ENT_S"},
        {"id": "QR-G-ENT-W", "code": "SAHYADRI_QR_G_ENT_W", "name": "Ground Floor · West Courtyard Gate", "floor": 0, "node_id": "N_G_W_PATIO", "physical_location": "West Gate Pillar near Visitors Lounge", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_G_ENT_W"},
        {"id": "QR-G-LIFT", "code": "SAHYADRI_QR_G_LIFT", "name": "Ground Floor · West Elevator Bank", "floor": 0, "node_id": "ELEV_1_0", "physical_location": "Lift Lobby Ground Floor Wall Plaque", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_G_LIFT"},
        {"id": "QR-ST1-A", "code": "SAHYADRI_QR_ST1_A", "name": "1st Floor · Staircase A Checkpoint", "floor": 1, "node_id": "STAIR_A_1", "physical_location": "1st Floor Landing, Staircase A near CAED Lab", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_ST1_A"},
        {"id": "QR-1-LIB", "code": "SAHYADRI_QR_1_LIB", "name": "1st Floor · Central Library Entrance", "floor": 1, "node_id": "N_1_W_LIB", "physical_location": "Central Library Turnstile Checkpoint", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_1_LIB"},
        {"id": "QR-ST2-B", "code": "SAHYADRI_QR_ST2_B", "name": "2nd Floor · Staircase B Checkpoint", "floor": 2, "node_id": "STAIR_B_2", "physical_location": "2nd Floor East Central Staircase Wall Mount", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_ST2_B"},
        {"id": "QR-2-LIFT", "code": "SAHYADRI_QR_2_LIFT", "name": "2nd Floor · West Elevator Bank", "floor": 2, "node_id": "ELEV_1_2", "physical_location": "2nd Floor Elevator Lobby Column", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_2_LIFT"},
        {"id": "QR-2-214", "code": "SAHYADRI_QR_2_214", "name": "2nd Floor · Room 214 Doorpost", "floor": 2, "node_id": "N_2_N_214", "physical_location": "Faculty Department Room 214 Door Sign", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_2_214"},
        {"id": "QR-3-CIVIL", "code": "SAHYADRI_QR_3_CIVIL", "name": "3rd Floor · Civil Engineering Dept", "floor": 3, "node_id": "N_3_N_STAFF", "physical_location": "Civil Department Staff Room Entrance", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_3_CIVIL"},
        {"id": "QR-4-GARDEN", "code": "SAHYADRI_QR_4_GARDEN", "name": "4th Floor · Sky Garden Promenade", "floor": 4, "node_id": "N_4_TERRACE", "physical_location": "Rooftop Garden Entry Archway", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_4_GARDEN"},
        {"id": "QR-5-INCUB", "code": "SAHYADRI_QR_5_INCUB", "name": "5th Floor · Incubation Centre Checkpoint", "floor": 5, "node_id": "N_5_N_INCUBATION", "physical_location": "Startup Incubation Reception Desk", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_5_INCUB"},
        {"id": "QR-C-PARK", "code": "SAHYADRI_QR_C_PARK", "name": "Campus Grounds · Parking Area", "floor": -1, "node_id": "CN_PARKING", "physical_location": "Parking Security Booth Pillar", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_C_PARK"},
        {"id": "QR-C-FOOD", "code": "SAHYADRI_QR_C_FOOD", "name": "Campus Grounds · Food Court Entrance", "floor": -1, "node_id": "CN_FOOD_COURT", "physical_location": "Food Court Portico Entrance", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_C_FOOD"},
        {"id": "QR-C-CRICKET", "code": "SAHYADRI_QR_C_CRICKET", "name": "Campus Grounds · Cricket Pavilion", "floor": -1, "node_id": "CN_CRICKET_GROUND", "physical_location": "Cricket Ground Pavilion Gate", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_C_CRICKET"},
        {"id": "QR-C-HOSTEL", "code": "SAHYADRI_QR_C_HOSTEL", "name": "Campus Grounds · Boys Hostel Gate", "floor": -1, "node_id": "CN_BOYS_HOSTEL", "physical_location": "Boys Hostel Main Entry Arch", "sample_qr_data": "https://sahyadri-nav.campus/qr?code=SAHYADRI_QR_C_HOSTEL"}
    ]

    # ==========================================
    # INITIAL ISSUES (for dynamic rerouting)
    # ==========================================
    initial_issues = [
        {
            "id": "ISSUE-01",
            "title": "Staircase A Closed for Maintenance",
            "type": "staircase_closed",
            "node_ids": ["STAIR_A_0", "STAIR_A_1", "STAIR_A_2", "STAIR_A_3"],
            "edge_ids": [],
            "floor": 1,
            "status": "active",
            "severity": "high",
            "description": "Routine step refinishing and painting; please use Staircase B or West Elevators.",
            "reported_at": "2026-09-24T18:00:00Z"
        }
    ]

    # Save to backend/data/
    os.makedirs('backend/data', exist_ok=True)
    with open('backend/data/floors.json', 'w', encoding='utf-8') as f:
        json.dump(floors, f, indent=2)
    with open('backend/data/locations.json', 'w', encoding='utf-8') as f:
        json.dump(locations, f, indent=2)
    with open('backend/data/nodes.json', 'w', encoding='utf-8') as f:
        json.dump(nodes, f, indent=2)
    with open('backend/data/edges.json', 'w', encoding='utf-8') as f:
        json.dump(edges, f, indent=2)
    with open('backend/data/qr_checkpoints.json', 'w', encoding='utf-8') as f:
        json.dump(qr_data, f, indent=2)
    with open('backend/data/issues.json', 'w', encoding='utf-8') as f:
        json.dump(initial_issues, f, indent=2)

    # Also copy to frontend/src/data/ for 100% offline fallback demo capability!
    os.makedirs('frontend/src/data', exist_ok=True)
    with open('frontend/src/data/floors.json', 'w', encoding='utf-8') as f:
        json.dump(floors, f, indent=2)
    with open('frontend/src/data/locations.json', 'w', encoding='utf-8') as f:
        json.dump(locations, f, indent=2)
    with open('frontend/src/data/nodes.json', 'w', encoding='utf-8') as f:
        json.dump(nodes, f, indent=2)
    with open('frontend/src/data/edges.json', 'w', encoding='utf-8') as f:
        json.dump(edges, f, indent=2)
    with open('frontend/src/data/qr_checkpoints.json', 'w', encoding='utf-8') as f:
        json.dump(qr_data, f, indent=2)
    with open('frontend/src/data/issues.json', 'w', encoding='utf-8') as f:
        json.dump(initial_issues, f, indent=2)

    print(f"Dataset generated successfully!")
    print(f"Floors: {len(floors)}")
    print(f"Locations: {len(locations)}")
    print(f"Nodes: {len(nodes)}")
    print(f"Edges: {len(edges)}")
    print(f"QR Checkpoints: {len(qr_data)}")

if __name__ == "__main__":
    create_dataset()
