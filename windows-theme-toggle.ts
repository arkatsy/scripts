// Name: Toggle System Theme
// Description: Toggles the system theme between light and dark mode

import "@johnlindquist/kit";
import * as _regedit from "regedit";
import { exec } from "child_process";

const regedit = _regedit.promisified;
const REGISTRY_PATH = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";
const DARK_THEME_VALUE = 0;
const LIGHT_THEME_VALUE = 1;

type SettingValue = {
  type: string;
  value: typeof DARK_THEME_VALUE | typeof LIGHT_THEME_VALUE;
};

type RegistryThemeKeys = {
  AppsUseLightTheme: SettingValue;
  SystemUsesLightTheme: SettingValue;
};

const res = await regedit.list([REGISTRY_PATH]);
const settingValues = res[REGISTRY_PATH].values;

if (!("AppsUseLightTheme" in settingValues) || !("SystemUsesLightTheme" in settingValues)) {
  throw new Error("AppsUseLightTheme or SystemUsesLightTheme not found in registry");
}

const isDark = (settingValues as RegistryThemeKeys).AppsUseLightTheme.value === DARK_THEME_VALUE;
const nextThemeValue = isDark ? LIGHT_THEME_VALUE : DARK_THEME_VALUE;

await regedit.putValue({
  [REGISTRY_PATH]: {
    AppsUseLightTheme: {
      type: "REG_DWORD",
      value: nextThemeValue,
    },
    SystemUsesLightTheme: {
      type: "REG_DWORD",
      value: nextThemeValue,
    },
  },
});

// When SystemUsesLightTheme changes, some elements like the taskbar need to be restarted for the theme to apply properly.
exec("taskkill /F /IM explorer.exe", (error) => {
  if (error) {
    throw new Error(`Failed to kill explorer.exe: ${error.message}`);
  }

  exec("start explorer.exe", (error) => {
    if (error) {
      throw new Error(`Failed to restart explorer.exe: ${error.message}`);
    }
  });
});
