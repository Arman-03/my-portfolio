// Dumps the generated world as JSON (for previews/tests). Run: node tools/dump-map.ts > map.json
import { buildWorld } from '../src/world/worldMap.ts';
process.stdout.write(JSON.stringify(buildWorld()));
