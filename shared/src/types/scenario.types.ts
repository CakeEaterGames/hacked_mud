export const Scenarios = ["idle", "HelloWorld", "hardline"] as const
export type Scenario = typeof Scenarios[number]