import { tmpdir } from "node:os";
import { join } from "node:path";
export const fixtureDirectory = join(tmpdir(), "denki-factory-fixtures");
export const fixturePath = (name: string) =>
  join(fixtureDirectory, `denki-${name}.json`);
