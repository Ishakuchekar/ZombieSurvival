import { MockGameEngine } from "./engine.js";

// This adapter is intentionally local-only. Replace it with fetch calls if a
// trusted C++ HTTP API is added; the current C++ engine has no API endpoints.
export class GameAdapter {
  constructor(engine = new MockGameEngine()) {
    this.engine = engine;
    this.mode = "browser prototype";
  }

  hasSave() { return this.engine.hasSave(); }
  load() { return this.engine.load(); }
  start(name, difficulty) { return this.engine.start(name, difficulty); }
  resume(state) { return this.engine.resume(state); }
  act(state, action, enemyId) { return this.engine.act(state, action, enemyId); }
  beginNight(state) { return this.engine.beginNight(state); }
  rest(state) { return this.engine.rest(state); }
  advance(state) { return this.engine.advance(state); }
  craft(state, recipe) { return this.engine.craft(state, recipe); }
  useAmmoPack(state) { return this.engine.useAmmoPack(state); }
  abandon(state) { return this.engine.abandon(state); }
  clearSave() { return this.engine.clearSave(); }
  leaderboard() { return this.engine.leaderboard(); }
}
