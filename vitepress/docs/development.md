# Development

This page is for user who want to modify the code of the hacked mud.

At the start call `make install` to install all node_modules locally. This will give your editor ability to highlight errors and give suggestions.

```shell
make install
```

When running in development mode use these commands to run the project in `hot reload` mode. After saving any file the project will quickly reload

```shell
made dev
made dev-d
make dev-logs
```

## Linting

Run `make lint` to launch eslint and TS compiler. It will catch most errors for you.

```shell
make lint
```

::: tip Note
Also note that the project uses husky. Meaning that it runs the linter before committing to git. To disable it, clear the .husky directory, but I'd advise you not to do it
:::

## Extra

```shell
make icons # Generates favicons
make docs  # Launch a local vitepress documentation
make pages # Generates github pages
```

