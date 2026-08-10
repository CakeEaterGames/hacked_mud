import { log } from "@backend/plugins/logger/logger";
import type { HackmudClient } from "../hackmudClient/hackmudClient.service";
import { ok, ResultAsync } from "neverthrow";
import type { ExecError } from "@backend/utils/neverthrow";
import { sleep } from "bun";
import { CustomError } from "./oog.types";
import { type Scenario } from "@shared/types/scenario.types";

export class OOG {
  public scenario: Scenario = "idle";
  private interval?: NodeJS.Timeout;

  private constructor(
    public users: string[],
    public client: HackmudClient
  ) {}

  static create(client: HackmudClient): ResultAsync<OOG, ExecError> {
    return this.getClientUsers(client).andThen(users => {
      log.info("Found users: {users}", { users });
      client.giveName(users[0] ?? "");
      const oog = new OOG(users, client);
      oog.start();
      return ok(oog);
    });
  }

  static getClientUsers(client: HackmudClient): ResultAsync<string[], ExecError> {
    return client.cmd("user").map(usersRes => {
      const users = usersRes.response
        .split("\n")
        .find(a => a.startsWith("Your users: "))
        ?.replace("Your users: ", "")
        .split(", ");

      if (!users) return [];

      const lastI = users.length - 1;
      users[lastI] = users[lastI]?.split(" ")[0] ?? "";

      return users;
    });
  }

  /**
   * A throwing cmd function
   * You can use it if you don't want to deal with neverthrow and catch exceptions the traditional way
   * @param text A shell command you want to execute
   * @returns Result of the command as a string
   */
  async cmd(text: string): Promise<string> {
    return await this.client.cmd(text).match(
      a => a.response,
      e => {
        throw new CustomError(e);
      }
    );
  }

  setScenario(scenario: Scenario) {
    this.scenario = scenario;
    this.client.gameStats.scenario = this.scenario;
    this.client.sendStatsUpdate();
  }

  start() {
    if (!this.interval) {
      this.interval = setInterval(() => {
        void this.update();
      }, 1000);
    }
  }
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private isUpdating = false;
  async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      switch (this.scenario) {
        case "idle":
          break;
        case "HelloWorld":
          await this.HelloWorld();
          break;
        case "hardline":
          await this.hardline();
          break;
      }
    } catch (e) {
      log.error({ e });
      this.stop();
    } finally {
      this.isUpdating = false;
    }
  }

  async HelloWorld() {
    let num = 1;
    while (true) {
      if (!this.client.isRunning()) return;
      if (num > 3) break;
      await this.cmd("#Hello_World_" + num);
      num++;
      await sleep(1000);
    }
    this.setScenario("idle");
  }

  async hardline() {
    await this.cmd("kernel.hardline");
    this.setScenario("idle");
  }
}
