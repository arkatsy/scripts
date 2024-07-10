// Name: Toggle System Theme

import "@johnlindquist/kit";
import * as _regedit from "regedit";
import { exec } from "child_process";

const regedit = _regedit.promisified;

const DARK_THEME_VALUE = 0;
const LIGHT_THEME_VALUE = 1;
type ThemeValues = typeof DARK_THEME_VALUE | typeof LIGHT_THEME_VALUE;

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
const props = ["AppsUseLightTheme", "SystemUsesLightTheme"];

function themeValuesExist(values: any): values is ThemeSettingsValues {
  return props.every((prop) => values[prop] !== undefined);
}

if (!themeValuesExist(settingValues)) {
  throw new Error("Theme values do not exist in registry");
}

// As a sensible default, the next theme is based on the AppsUseLightTheme. 
// It's for the case where AppsUseLightTheme & SystemUsesLightTheme are not synced.
const isDark = settingValues.AppsUseLightTheme.value === DARK_THEME_VALUE;

await regedit.putValue({
  [REGEDIT_PATH]: {
    AppsUseLightTheme: {
      type: "REG_DWORD",
      value: isDark ? LIGHT_THEME_VALUE : DARK_THEME_VALUE,
    },
    SystemUsesLightTheme: {
      type: "REG_DWORD",
      value: isDark ? LIGHT_THEME_VALUE : DARK_THEME_VALUE,
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
