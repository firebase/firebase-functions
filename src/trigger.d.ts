declare interface FirebaseTriggerDefinition {
  service: string;
  event: string;
  options: {[option: string]: any};
}
