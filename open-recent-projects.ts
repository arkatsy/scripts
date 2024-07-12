// Name: Open Recent VS Code Project
// Description: Open recent vscode project (with remote connection support)

import "@johnlindquist/kit"
import { Action } from "@johnlindquist/kit"
import { URL, fileURLToPath } from "url"
import * as path from 'path';

/**
 * Wether to include projects that are a single file in recent projects (defaults to false)
 */
const includeSingleFiles = false

// /Users/johnlindquist/Library/Application Support/Code/User/globalStorage/state.vscdb
let filename = home("Library", "Application Support", "Code", "User", "globalStorage", "state.vscdb")
// windows path
if (isWin) filename = home("AppData", "Roaming", "Code", "User", "globalStorage", "state.vscdb")
// @ts-ignore
let { default: sqlite3 } = await import("sqlite3")
let { open } = await import("sqlite")

const db = await open({
  filename,
  driver: sqlite3.Database,
})

let key = `history.recentlyOpenedPathsList`
let table = `ItemTable`

let result = await db.get(`SELECT * FROM ${table} WHERE key = '${key}'`)
let recentPaths = JSON.parse(result.value)

// Collect all "recent project" data and parse it for display in kit (special cases for vscode-remote, virtual desktop and single files)
let recentFilePaths: Action[] = []
for (const entry of recentPaths.entries) {
  // Check if entry is a folder
  if (entry.folderUri) {
    if (entry.folderUri.startsWith("file://")) {
      // Default case (recent project is a regular folder)
      let path = fileURLToPath(new URL(entry.folderUri))
      const label = getLabelFromPath(path)

      if (path.includes(":\\")) {
        path = getCapitalizedPath(path)
      }

      recentFilePaths.push({name: label ?? "fallback", description: path, value: path})
    } else if ((entry.folderUri.startsWith("vscode-remote://") || entry.folderUri.startsWith("vscode-vfs://"))) {
      // Project is a folder but on remote (ssh or github virtual desktop)
      const label = entry.label ?? getLabelFromPath(entry.folderUri, true);
      // vscode remote session expects to be launched like `code --folder-uri=vscode-remote://<path>` (same for vscode-vfs)
      const value = `--folder-uri=${entry.folderUri}`
      recentFilePaths.push({name: label, description: entry.folderUri, value: value})
    }
  } else {
    // This branch only occurs if recent project is a single file instead of entire folder (ignored by default)
    // To also add single files to recent projects, go to line 9 and change `includeSingleFiles` from false to true
    if (includeSingleFiles) {
      try {
        const path = fileURLToPath(new URL(entry.fileUri))
        const label = getLabelFromPath(path)
        recentFilePaths.push({name: label, description: path, value: path})
      } catch (error) {
        // In case recent project is different non supported type
        console.error(`Failed to parse ${entry.folderUri}. Error: ${error}`)
      }
    }
  }
}

let recentPath = await arg("Open recent project", recentFilePaths)
hide()
await exec(`code ${recentPath}`)

function getLabelFromPath(inPath: string, isRemote = false) {
  const outPathBase = path.basename(inPath)
  if (!isRemote) {
    return outPathBase
  } else {
    const parts = inPath.split("%2B");
    const protocol = parts[0].split("://")[1].replaceAll("-remote", "").toUpperCase();
    const host = parts[1].split("/")[0];

    return `${outPathBase} [${protocol}: ${host}]`
  }
}

function getCapitalizedPath(path: string) {
  const firstCharNew = path.charAt(0).toUpperCase();
  const slicedPath = path.slice(1)
  return firstCharNew + slicedPath;
}