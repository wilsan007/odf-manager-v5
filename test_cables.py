import urllib.request
import urllib.parse
import json

url = "https://mqiviffwqahklsdwyubm.supabase.co"
anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaXZpZmZ3cWFoa2xzZHd5dWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTYwNzIsImV4cCI6MjA5MjkzMjA3Mn0.-AwpAp999GHOLhEwMzrSnL8o57gDiWRrmTYvXUNY-s0"

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json"
}

def get_data(endpoint):
    req = urllib.request.Request(f"{url}/rest/v1/{endpoint}", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error querying {endpoint}: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode())
        return None

def main():
    print("--- 1. Fetching raw cables ---")
    raw_cables = get_data("cables_fibre")
    if not raw_cables:
        return
    print(f"Total cables in DB: {len(raw_cables)}")
    for c in raw_cables:
        print(f"Cable Ref: {c['cable_reference']}, type_lien: {c['type_lien']}, source: {c['port_source_id']}, dest: {c['port_dest_id']}")

    print("\n--- 2. Fetching cables with joins (frontend query style) ---")
    # PostgREST nested select syntax
    select_param = "*,port_source:ports!cables_fibre_port_source_id_fkey(id,slot_port,slot_id,slots(id,name,slot_num,odfs(id,name,odf_type,racks(id,name,salles(id,name,sites(id,name)))))),port_dest:ports!cables_fibre_port_dest_id_fkey(id,slot_port,slot_id,slots(id,name,slot_num,odfs(id,name,odf_type,racks(id,name,salles(id,name,sites(id,name))))))"
    encoded_select = urllib.parse.quote(select_param)
    joined_cables = get_data(f"cables_fibre?select={encoded_select}")
    if joined_cables is None:
        return
    print(f"Total cables returned with join: {len(joined_cables)}")
    
    # Check if any cables have port_source or port_dest as None
    for c in joined_cables:
        ref = c['cable_reference']
        t_lien = c['type_lien']
        src = c.get('port_source')
        dst = c.get('port_dest')
        print(f"Cable Ref: {ref}, type_lien: {t_lien}, port_source resolved: {src is not None}, port_dest resolved: {dst is not None}")
        if not src:
            print(f"  -> WARNING: port_source is None for ID {c['port_source_id']}")
        if not dst:
            print(f"  -> WARNING: port_dest is None for ID {c['port_dest_id']}")

    # Let's inspect port information for BET-S1-R2-ODF1_S06P01 (from user description)
    print("\n--- 3. Inspecting specific port: BET-S1-R2-ODF1_S06P01 ---")
    port_id = "BET-S1-R2-ODF1_S06P01"
    port_data = get_data(f"ports?id=eq.{port_id}")
    print(f"Port {port_id} data: {port_data}")
    
    if port_data:
        slot_id = port_data[0]['slot_id']
        print(f"Slot ID for port: {slot_id}")
        slot_data = get_data(f"slots?id=eq.{slot_id}")
        print(f"Slot {slot_id} data: {slot_data}")
        
        if slot_data:
            odf_id = slot_data[0]['odf_id']
            print(f"ODF ID for slot: {odf_id}")
            odf_data = get_data(f"odfs?id=eq.{odf_id}")
            print(f"ODF {odf_id} data: {odf_data}")

if __name__ == "__main__":
    main()
