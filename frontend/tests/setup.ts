import "@testing-library/jest-dom";

/**
 * RTK Query requires fetch, Request, Headers, and Response.
 * Node 18+ has these as globals, but JSDOM (used by Jest) might not 
 * expose them correctly or might overwrite them.
 */

if (typeof global.Request === "undefined") {
  (global as any).Request = class {
    constructor(public url: string, public init: any = {}) {
      Object.assign(this, init);
    }
  };
}

if (typeof global.Headers === "undefined") {
  (global as any).Headers = class {
    map: any = {};
    append(k: string, v: string) { this.map[k] = v; }
    delete(k: string) { delete this.map[k]; }
    get(k: string) { return this.map[k] || null; }
    has(k: string) { return k in this.map; }
    set(k: string, v: string) { this.map[k] = v; }
    forEach(cb: any) { Object.keys(this.map).forEach(k => cb(this.map[k], k, this)); }
  };
}

if (typeof global.Response === "undefined") {
  (global as any).Response = class {
    constructor(public body: any, public init: any = {}) {}
    ok = this.init.status ? this.init.status < 400 : true;
    status = this.init.status || 200;
    async json() { return typeof this.body === "string" ? JSON.parse(this.body) : this.body; }
    async text() { return typeof this.body === "string" ? this.body : JSON.stringify(this.body); }
    clone() { return new (global as any).Response(this.body, this.init); }
  };
}

if (typeof global.fetch === "undefined") {
  global.fetch = jest.fn() as any;
}
