// src/index.ts

import {
  ExpressEasyPGPluginOptions,
  ModelFnInput,
  RawSQLPartSignature,
} from "./types";
import { DB, DBManager, Model, SQL } from "easy-psql";
import { loadModels } from "./helpers";
import express from "ultimate-express";

declare module "ultimate-express" {
  interface Application {
    initEasyPG: () => Promise<void>;
    easyPG: {
      pool: typeof DB.pool;
      model(opts: ModelFnInput): Model;
      db: typeof DB;
      dbManager: typeof DBManager;
      rawSQLPart: (cb: RawSQLPartSignature) => SQL;
      reloadModels: () => Promise<void>;
    };
  }
}

const expressEasyPG = (
  app: express.Express,
  opts?: ExpressEasyPGPluginOptions
): express.Application => {
  const options = opts || {};
  if (!options.port) {
    options.port = 5432;
  }
  if (!options.host) {
    options.host = "localhost";
  }
  if (!options.database) {
    options.database = "postgres";
  }
  if (!options.user) {
    options.user = "postgres";
  }
  if (!options.password) {
    options.password = "postgres";
  }

  try {
    const extendedApp = app as unknown as express.Application;

    extendedApp.initEasyPG = async () => {
      await loadModels(options);
      DB.registerConnectionConfig({
        ...options,
        min: options.min_pool_size,
        max: options.max_pool_size,
      });

      DB.enableLog = !!options.logSQL;
      extendedApp.easyPG = {
        pool: DB.pool,
        db: DB,
        dbManager: DBManager,
        rawSQLPart: (cb: RawSQLPartSignature) => new SQL(cb),
        reloadModels: async () => await loadModels(options),
        model: (modelOpts: ModelFnInput) => {
          const model = DB.modelFactory?.[modelOpts?.schema || "public"]?.[
            modelOpts?.table
          ] as typeof Model;
          if (!model) {
            throw new Error(
              `Model ${modelOpts.schema || "public"}.${
                modelOpts.table
              } is not registered`
            );
          }

          const instance = new model(modelOpts.connection);

          return instance;
        },
      };
    };
    return extendedApp;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Unknown error");
  }
};

export default expressEasyPG;
export { expressEasyPG };
