# REST API

After launching the app you will find the api docs there <http://localhost:4434/hacked_mud_api/docs>.

It will contain an interactive dashboard where you can try each method and see the input/output models.
To keep this page short I will only briefly talk about each method and you can read the rest when you launch the app.


| Method | Endpoint | Description |
| -------- | ---------- | ------------- |
| POST | `/findClients` | Finds all active `hackmud` clients. Use retrieved PIDs from this method to call other methods. |
| POST | `/getShellContents` | Returns the contents of the shell of a `hackmud` client. |
| POST | `/getGameState` | Returns game state of a `hackmud` client. It can tell if the client is currently processing a command and can report a hardline state and timer. |
| POST | `/sendCmd` | Sends a shell command. It waits until the command is processed before returning a response. |
| POST | `/setScenario` | Finds an OOG and sets a user-defined scenario. Read about scenarios on the [next page](/docs/ts-integration) |
| WS | `/ws` | A WebSocket connection. It sends you all updates from all `hackmud` clients. |
