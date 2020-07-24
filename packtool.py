import json
import argparse
import string
import random

parser = argparse.ArgumentParser(description='nedb pack/unpack tool')
parser.add_argument('action', help='action')
parser.add_argument('file', help='pack to pack/unpack')
args = parser.parse_args()

random_ids = set()

def generate_random_id():
    random_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    while random_id in random_ids:
        random_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    return random_id

if args.action == 'pack':
    with open('source/'+args.file+'.json', "r") as read_file:
        data = json.load(read_file)
    with open('packs/'+args.file+'.db', 'w') as outfile:
        for item in data:
            if '_skip_' not in item['name']:
                item['_id'] = generate_random_id()
                outfile.write(json.dumps(item))
                outfile.write('\n')

if args.action == 'unpack':
    data = []
    with open('packs/'+args.file+'.db', 'r') as read_file:
        db = read_file.read().splitlines()
        for item in db:
            data.append(json.loads(item))

    with open('source/'+args.file+'.json', "w") as outfile:
        outfile.write(json.dumps(data, indent=4))