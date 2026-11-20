import * as rethink from 'rethinkdb';

export const RethinkdbProvider = {
  provide: 'RethinkdbProvider',
  useFactory: async () => {
    const conn = await rethink.connect({
      host: 'localhost',
      port: 28015,
      db: 'test',
    });
    return conn;
  },
};
