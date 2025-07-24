// src/index.ts
import { DB as DB2, DBManager, SQL } from "easy-psql";

// src/helpers.ts
import getPGSchemas from "easy-pg-scanner";
import { Column, DB, Model, Relation } from "easy-psql";
var loadDBSchemas = async (config) => {
  const schemas = await getPGSchemas(config);
  return schemas.map((schema) => {
    return {
      schema: schema.schema,
      tables: (Array.isArray(schema.tables) ? schema.tables : []).map(
        (table) => ({
          ...table,
          columns: Array.isArray(table.columns) ? table.columns.map((col) => ({
            ...col,
            id: `_${schema.schema}_${table.table}_${col.name}`
          })) : []
        })
      )
    };
  });
};
var loadModels = async (config) => {
  try {
    const dbSchemas = await loadDBSchemas(config);
    DB.modelFactory = {};
    DB.models = {};
    for (const { schema, tables = [] } of dbSchemas) {
      if (!tables?.length) {
        continue;
      }
      for (const table of tables) {
        const model = buildModelClass({
          table,
          schema,
          relations: (config?.relations || []).filter(
            (x) => x.from_table === table.table && x.from_schema === schema
          )
        });
        if (model) {
          DB.register(model);
        }
      }
    }
  } catch (error) {
    throw error;
  }
};
var buildModelClass = ({
  table,
  schema,
  relations
}) => {
  if (!Array.isArray(table?.columns) || !table?.columns?.length) {
    return null;
  }
  const modelColumns = (table.columns || []).reduce((acc, col) => {
    acc[col.name] = new Column(col);
    return acc;
  }, {});
  const modelRelations = (relations || []).reduce((acc, rel) => {
    acc[rel.alias] = new Relation({
      ...rel,
      schema: rel.to_schema || "public"
    });
    return acc;
  }, {});
  return class extends Model {
    constructor(conn) {
      super(table.table, conn, schema);
      this.columns = modelColumns;
      this.relations = modelRelations;
    }
  };
};

// src/index.ts
var expressEasyPG = (app, opts) => {
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
    const extendedApp = app;
    extendedApp.initEasyPG = async () => {
      await loadModels(options);
      DB2.registerConnectionConfig({
        ...options,
        min: options.min_pool_size,
        max: options.max_pool_size
      });
      DB2.enableLog = !!options.logSQL;
      extendedApp.easyPG = {
        pool: DB2.pool,
        db: DB2,
        dbManager: DBManager,
        rawSQLPart: (cb) => new SQL(cb),
        reloadModels: async () => await loadModels(options),
        model: (modelOpts) => {
          const model = DB2.modelFactory?.[modelOpts?.schema || "public"]?.[modelOpts?.table];
          if (!model) {
            throw new Error(
              `Model ${modelOpts.schema || "public"}.${modelOpts.table} is not registered`
            );
          }
          const instance = new model(modelOpts.connection);
          return instance;
        }
      };
    };
    return extendedApp;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Unknown error");
  }
};
var index_default = expressEasyPG;
export {
  index_default as default,
  expressEasyPG
};
