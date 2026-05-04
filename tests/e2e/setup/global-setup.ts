import { isE2eDbResetEnabled } from "../utils/db";
import {
  finalizeE2ePreparation,
  prepareE2eEnvironment,
} from "../utils/prepare";

export default async function globalSetup() {
  if (!isE2eDbResetEnabled()) {
    return;
  }

  await prepareE2eEnvironment();

  return async () => {
    await finalizeE2ePreparation();
  };
}
