// Name: Toggle System Theme
// Author: arkatsy
// Description: Toggles the system theme between light and dark mode.
// Keywords: windows, theme, dark, light, toggle

import "@johnlindquist/kit";
import * as _regedit from "regedit";
import { exec } from "child_process";

const regedit = _regedit.promisified;

const DARK_THEME_VALUE = 0;
const LIGHT_THEME_VALUE = 1;
type ThemeValues = 0 | 1;

type SettingValue = {
  type: string;
  value: ThemeValues;
};

type ThemeSettingsValues = {
  AppsUseLightTheme: SettingValue;
  SystemUsesLightTheme: SettingValue;
};

const REGEDIT_PATH = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";

const res = await regedit.list([REGEDIT_PATH]);
const settingValues = res[REGEDIT_PATH].values;

function themeValuesExist(values: any): values is ThemeSettingsValues {
  return ["AppsUseLightTheme", "SystemUsesLightTheme"].every((prop) => values[prop] !== undefined);
}

if (!themeValuesExist(settingValues)) {
  console.error("AppsUseLightTheme or SystemUsesLightTheme not found in registry");
  exit();
}

// In the case where AppsUseLightTheme & SystemUsesLightTheme are not synced,
// the next value comes 
const isDark = settingValues.AppsUseLightTheme.value === DARK_THEME_VALUE;
const nextThemeValue = isDark ? LIGHT_THEME_VALUE : DARK_THEME_VALUE;

await regedit.putValue({
  [REGEDIT_PATH]: {
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

// When SystemUsesLightTheme changes, some elements like the taskbar need to be restarted for the changes to take effect.
exec("taskkill /F /IM explorer.exe", (error) => {
  if (error) {
    console.error(`Failed to kill explorer.exe: ${error.message}`);
    return;
  }

  exec("start explorer.exe", (error) => {
    if (error) {
      console.error(`Failed to restart explorer.exe: ${error.message}`);
      return;
    }

    console.log("explorer.exe restarted successfully");
  });
});
