import openapi from "@elysiajs/openapi";
import cors from "@elysiajs/cors";
import Elysia from "elysia";
import { env } from "./config";
import { logtapePlugin } from "@backend/plugins/logger/logger.plugin";
// import { logtapePlugin } from "./plugins/logger/logger.plugin";
import { healthHandler } from "./modules/healthcheck/healthcheck.handler";
import { helloworldHandler } from "./modules/helloworld/helloworld.handler";
// import { treaty } from '@elysia/eden'

const apiAppNoPrefix = new Elysia()
  .use(cors())
  .use(
    openapi({
      provider: "scalar",
      path: "/docs",
      specPath: "/openapi/json",
      documentation: {},
    })
  )
  .use(logtapePlugin)
  .use(helloworldHandler)
  .use(healthHandler);

export const apiApp = new Elysia({ prefix: env.API_BASE_URL, name: "hacked-mud-api" }).use(
  apiAppNoPrefix
);

export type apiAppTypes = typeof apiAppNoPrefix;
// const eden = treaty<apiAppTypes>('localhost:3000')

// import { Project } from 'ts-morph';

// const project = new Project({
//    tsConfigFilePath: './tsconfig.json'
// });
// const sourceFile = project.addSourceFileAtPath('./src/apiApp.ts');
// const variable = sourceFile.getVariableDeclaration('apiAppNoPrefix');
// const type = variable?.getType();

// console.log(type?.getText()); // Prints the type
