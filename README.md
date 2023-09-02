# gaggle/deliverymetrics 0.1.12

## Installation

### Download

Binaries are available in the releases, select the one for your operating system:

https://github.com/gaggle/deliverymetrics/releases/latest

### Container

E.g. using Docker:

  ```shell
  $ docker run --rm -it ghcr.io/gaggle/deliverymetrics:latest --help
  ```

Note though,
that you'll have to map local files into the container
and then manipulate the CLI from within the container.
E.g. this command will drop you into the container's shell:

```shell
$ docker run --rm -it -v $(pwd):/tmp entrypoint=bash ghcr.io/gaggle/deliverymetrics:latest
```

And then you can run the `deliverymetrics` CLI, e.g.:

```shell
$ cd tmp; deliverymetrics sync
```

## How to use

### 1. Generate a Configuration File

Create a `.json` file to specify which source to sync from,
and how to generate a report.

`dm.json`

```json
{
  "$schema": "https://github.com/gaggle/deliverymetrics/blob/main/configuration-schema.json",
  "sync": {
    "github": {
      "repo": "repo specifier, e.g. gaggle/deliverymetrics",
      "token": "github token with read permissions for the repository"
    }
  },
  "report": {
    "type": "csv",
    "outdir": "./deliverymetrics-report",
    "github": {
      "actionRuns": {
        "branch": "main"
      }
    }
  }
}
```

### 2. Sync

```shell
$ deliverymetrics sync -c
Syncing...
Legend: r=action-run, w=action-workflow, c=commit, p=pull|pull-commit, R=release, s=stats
wwwsscccccccccRRRRRRRRRRRRRccccccccccccrrrrrrrrrrcccccccccccss
✅
```

Metrics for the repository has now been synced.
The first time to sync might take a while,
but following syncs will be quicker because only new data is synced.

### 3. Generate Report

```shell
$ deliverymetrics report
ℹ Github client cache report:
  Last synced: never
  Number of cached pulls: 0
..............
✅

```

All the various .csv reports have been created,
easy to import into a spreadsheet to find patterns.

## Usage

```shell
$ deliverymetrics --help
deliverymetrics <command>

Commands:
  deliverymetrics sync    Sync data as specified in configuration file
  deliverymetrics report  Generate report as specified in configuration file
```

```shell
$ deliverymetrics sync --help
deliverymetrics sync

Sync data as specified in configuration file

Options:
  -c, --config    Configuration file for what and how to sync, defaults: dm.json, dm.jsonc    
```

```shell
$ deliverymetrics report --help
deliverymetrics report

Generate report as specified in configuration file

Options:
  -c, --config    Configuration file for what and how to sync, defaults: dm.json, dm.jsonc
```

### Binaries and MacOS Compatibility

Deliverymetrics binaries are available for download in the releases section of this project.
However, please note these binaries are not signed,
because the costs of obtaining a signed certificate can't be justified at this time.

For MacOS users,
this means you will need to follow this process once before you can use the application:

* Download the Deliverymetrics binary from the [releases] page.
* Locate the downloaded file in Finder.
* **Right-click on file and choose "Open"** from the context menu.
* A dialogue box will appear, warning you that the app is not signed. Click "**Open**" to proceed.
* The app will run in Terminal,
  and because it's run without arguments, it'll just print its help.
  You can close this window.

From this point forward,
MacOS will allow you to use the application normally.

Sorry for the inconvenience.

[releases]: https://github.com/gaggle/deliverymetrics/releases
