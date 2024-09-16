#!/usr/bin/env python3

import argparse
import base64
import json
import random
import string
import sys

def parse_args():
    parser = argparse.ArgumentParser(description='nedb pack/unpack tool')
    parser.add_argument('action', choices=['pack', 'unpack', 'repack',],
                        help='action')
    parser.add_argument('file', help='pack to pack/unpack')
    args = parser.parse_args()
    return args

def generate_random_id():
    random_ids = set()
    random_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    while random_id in random_ids:
        random_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    return random_id

def img_to_base_64(image):
        with open(image.replace("systems/D35E/",""), "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')

def main():
    args = parse_args()

    if args.action == 'unpack' or args.action == 'repack':
        data = []
        with open('packs/'+args.file+'.db', 'r') as read_file:
            db = read_file.read().splitlines()
            for item in db:
                data.append(json.loads(item))

        with open('source/'+args.file+'.json', "w") as outfile:
            outfile.write(json.dumps(data, indent=4))

    if args.action == 'pack' or args.action == 'repack':

        with open('source/'+args.file+'.json', "r") as read_file:
            data = json.load(read_file)

        with open('packs/'+args.file+'.db', 'w') as outfile:
            for item in data:
                if '_skip_' not in item['name']:
                    if item['_id'] == 'generate':
                        item['_id'] = generate_random_id()
    #                 try:
    #                     item['img'] = 'data:image/png;base64, ' + img_to_base_64(item['img'])
    #                 except:
    #                     pass
                    outfile.write(json.dumps(item))
                    outfile.write('\n')

if __name__ == '__main__':
    sys.exit(main())
