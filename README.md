# ultimate-express-easy-pg

A ultimate-express plugin for simplified PostgreSQL model access using [`easy-psql`](https://www.npmjs.com/package/easy-psql). It automaticaly scans your PostgreSQL tables per schema and registers their models as classes in memory. Please see how the underlying model functions work, by visiting the docs of [`easy-psql`](https://www.npmjs.com/package/easy-psql).

## Features

- Easy integration with PostgreSQL using a model-based approach
- Optional relation definitions
- Full access to raw SQL, DB manager, and registered models
- Hot-reload models without restarting the server

---

## Installation

```bash
npm install ultimate-express-easy-pg
```

---

## Usage

```ts
import express from "ultimate-express";
import { expressEasyPG } from "@ultimate-express/easy-pg";

const bootstrap = async () => {
  const app = expressEasyPG(express(), {
    host: "localhost",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: "postgres",
    relations: [
      {
        alias: "author",
        from_schema: "public",
        to_schema: "public",
        from_table: "posts",
        from_column: "author_id",
        to_table: "users",
        to_column: "id",
        type: "object", // or array ,
      },
    ],
  });

  await app.initEasyPG();

  app.get("/users", async (req, reply) => {
    const model = app.easyPG.model({ table: "users", schema: "public" });
    const users = await model.find({});
    reply.send(users);
  });

  app.listen(3000);
};

bootstrap();
```

---

## Plugin Options

```ts
interface ExpressEasyPGPluginOptions {
  host?: string;
  port?: number | string;
  min_pool_size?: number;
  max_pool_size?: number;
  database?: string;
  user?: string;
  password?: string;
  relations?: RelationConfig[];
  logSQL?: boolean; // it only logs when model functions (find,findOne,create,createMany,createTX,createManyTX,update,delete are called)
}
```

### Example with relations

```ts
relations: [
  {
    alias: "comments",
    from_schema: "public",
    from_table: "posts",
    from_column: "id",
    to_table: "comments",
    to_column: "post_id",
    type: "array",
  },
];

const model = app.easyPG.model({ table: "posts" });
await model.find({ include: { comments: true } }); // use the alias
```

---

## Accessing `easyPG` Utilities

Once registered, `app.easyPG` provides:

- `model({ table, schema?, connection? })`: Get a model instance
- `db`: Access the underlying `DB` class from `easy-psql`
- `dbManager`: Access the DB manager
- `rawSQLPart(cb)`: Create reusable raw SQL parts for more flexibility
- `reloadModels()`: Reload the models (useful in development)
- `pool`: The node-pg pool

---
