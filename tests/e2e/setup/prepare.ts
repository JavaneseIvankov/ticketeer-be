import {
  finalizeE2ePreparation,
  prepareE2eEnvironment,
} from "../utils/prepare";

await prepareE2eEnvironment();
await finalizeE2ePreparation();
