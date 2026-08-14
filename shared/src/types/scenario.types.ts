export const Scenarios = ["idle", "HelloWorld", "hardline", "scan2"] as const
export type Scenario = typeof Scenarios[number]