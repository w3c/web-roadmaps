# Framework for Web technology roadmaps

This repository hosts a framework to present roadmaps of ongoing and future Web technologies.

It aims at simplifying the creation and maintenance of such roadmaps by collecting automatically information about standardization and implementation status of features described in W3C specifications and others.

## Available roadmaps
* [Overview of Media Technologies for the Web](https://w3c.github.io/web-roadmaps/media/)
* [Roadmap for Security technologies](https://w3c.github.io/web-roadmaps/security/)
* [Roadmap of Web Applications on Mobile](https://w3c.github.io/web-roadmaps/mobile/)
* [Roadmap of Technologies Needed for Web Publications](https://w3c.github.io/web-roadmaps/publishing/)

## Table of contents
* [Overview of the framework](#overview-of-the-framework)
* [Adding a feature to a roadmap](#adding-a-feature-to-a-roadmap)
* [JSON format for describing specifications](#json-format-for-describing-specifications)
* [Creating a new roadmap page or a new single-page roadmap](#creating-a-new-roadmap-page-or-a-new-single-page-roadmap)
* [Creating the index of a new multi-page roadmap](#creating-the-index-of-a-new-multi-page-roadmap)
* [Repository branches](#repository-branches)
* [Translating a roadmap](#translating-a-roadmap)

## Overview of the framework

A **roadmap** is defined here as a collection of features that make up a consistent set of technologies used to build a particular type of applications (e.g. media applications, games) or to promote a particular aspect of application development (e.g. security). Each feature is described in prose to explain its relevance to the theme of the roadmap. From that prose, the framework generates tables (one per section) summarizing the standardization and implementation status of the specification(s) that define(s) the said feature.

A given roadmap is expected to contain one or more of the following sections describing the high-level status of the features described in the section:
* *Well-deployed technologies* are technologies that are finished or nearly finished (e.g. CR and beyond in the W3C Rec track) and that have already found significant adoption among implementations;
* *Technologies in progress* list features that have already started their standardization track progress;
* *Exploratory work* groups features described in specifications prior to their proper standardization work;
* *Features not covered by ongoing work* identify functionalities that are known to be needed for some use cases, but that no existing specification adequately covers
* *Discontinued features* point out attempts to develop a feature that was deemed useful at a point in time, but that was stopped for some reason, or that led to some alternative proposal.

Multiple roadmaps can be associated in a single **multi-page roadmap** with a front index page that links to individual roadmap pages. The framework generates a navigation menu in each individual roadmap page to navigate between them.

In short, the goal of the framework is to allow roadmap authors to focus on the prose that describes features that compose the roadmap, the framework taking care of adding implementation data for each feature that composes the roadmap and of formatting the result, including providing means for users to navigate between pages.

While the pages are generated dynamically in the browser, it is likely preferable to publish exported versions of the roadmaps since the framework has not been optimized for performance.

## Adding a feature to a roadmap

A **feature** is roughly speaking a piece of technology that the target audience of the document would recognize as something they need to build the product they are interested in.

For the 3 first categories of features described above, a feature comes with one or more specifications that covers it. The process to add a feature to a roadmap or add a specification to an existing feature is as follows:
* a feature is defined in an encompassing HTML element (typically `<p>` or `<div>`) by adding a `data-feature` attribute to it with the name of the feature as its value. For instance, `<p data-feature='Video capture'></p>` will serve as the container for the prose describing the said feature and the specs that cover it
* each spec that provides the hook for the said feature needs to be listed in that container element with a `<a>` tag containing a `data-featureid` attribute, whose value is a shortname for the specification that refers to the JSON file described below. For instance, adding `<a data-featureid='getusermedia'>the Media Capture and Streams API</a>` to the paragraph above indicates that the specification described by the `getusermedia.json` file provides a way to implement the "video capture" feature
* the [data](data/) directory contains a JSON file that describes the various specifications that provides the hooks relevant to the various features; that JSON file follows a [format described below](#json-format-for-describing-specifications).

## JSON format for describing specifications

Each specification is described by a JSON object that will allow retrieving information about the standardization status of the spec and its level of implementation in browsers.

That JSON object is stored in a file in the [data](data/) directory, whose name is then used to refer to the said specification from relevant features.

Depending on the advancement of the underlying specification, the JSON object can have the following properties:
* `url`: should point to the URL of the latest version of the specification. This URL will be used to collect additional data about the spec (standardization status, Working Groups that produce it, editors draft, etc) and as target of links that reference the feature. URL may contain a fragment to point to a specific section in a specification. If the `url` property is not specified, the framework assumes that the underlying specification is a W3C specification,  that the filename is its short name, and that the URL of the spec is `https://www.w3.org/TR/[filename]/`.
* `impl`: for specifications for which browser implementations are expected, the `impl` property explains where to look for implementation info. Described below in [Describing implementation status](#describing-implementation-status).
* `polyfills`: for specifications for which there are polyfills available that would be worth reporting, the `polyfills` property lists these polyfills. It should be an array of objects that have a `url` property that links to the polyfill's home page on the Web, and a `label` property with the name of polyfill.
* `feature`: in case the reference to the specification would benefit from being more specific than the specification as a whole, the `feature` property allows to add the name of the specific feature (see e.g. the [reference to the HTMLMediaElement interface in the HTML5 specification](data/htmlmediaelement.json)).
* `title`: when the specification is unknown to the [W3C API](https://w3c.github.io/w3c-api/) and to [Specref](https://www.specref.org/), the `title` property should be set to the title of the specification.
* `edDraft`: when the specification is unknown to the [W3C API](https://w3c.github.io/w3c-api/) and to [Specref](https://www.specref.org/), or when these APIs do not know the URL of the Editor's Draft for the specification, the `edDraft` property should contain the URL of the Editor's Draft of the specification.
* `wgs`: when the specification is unknown to the [W3C API](https://w3c.github.io/w3c-api/) and to [Specref](https://www.specref.org/), the `wgs` property should be an array of objects describing the groups that are producing the spec; each such object should have a `url` property with a link to the group's home page, and a `label` property with the name of the group.
* `publisher`: the organization that published the specification. The framework automatically computes the publisher for W3C, WHATWG, and IETF specifications.

Here is an example of a JSON file that describes the "Intersection Observer" specification:
```json
{
  "url": "https://www.w3.org/TR/intersection-observer/",
  "impl": {
    "caniuse": "intersectionobserver",
    "chromestatus": 5695342691483648,
    "webkitstatus": "specification-intersection-observer",
    "edgestatus": "Intersection Observer"
  },
  "polyfills": [
    {
      "label": "Polyfill.io",
      "url": "https://polyfill.io/v2/docs/features/#IntersectionObserver"
    }
  ]
}
```

### Describing implementation status

*Note (March 2018): implementation status features are still being worked upon in the framework. The implementation description should remain backward compatible, but it may still evolve.*

Provided the description contains relevant information, the framework can automatically retrieve the implementation status in main browsers from the following Web platform status sources: [Can I use](http://caniuse.com/), [Chrome Platform Status](https://www.chromestatus.com/features), [Microsoft Edge web platform features status and roadmap](https://developer.microsoft.com/en-us/microsoft-edge/platform/status/) and [WebKit Feature Status](https://webkit.org/status/).

To enable this, the decription must contain an `impl` property whose value is an object with one or more of the following optional properties:
* `caniuse`: the name of the feature in [Can I use](http://caniuse.com/) (the one that appears in the URL after `#feat=`)
* `chromestatus`: the number used to identify features in [Chrome Platform Status](https://www.chromestatus.com/features) (the one that appears in the URL after `features/`)
* `edgestatus`: the name used to identify features in [Microsoft Edge web platform features status and roadmap](https://developer.microsoft.com/en-us/microsoft-edge/platform/status/) (the full feature title that appears in the page)
* `webkitstatus`: the name used to identify features in [WebKit Feature Status](https://webkit.org/status/) (the one that appears in the URL after `status/#`)
* `other`: manually entered implementation status. See below for details.

From time to time, platform status sources may:
* contain implementation information about the specification but at a different granularity level, e.g. you want implementation info about the entire specification and the site only gives implementation status about a particular feature within the specification, or the opposite)
* contain implementation information which you know is *incorrect*.
* not contain any information about a specification at all

When this happens, you may use the `other` sub-property to specify implementation status manually. Property value must be an array of objects that have the following properties:
* `ua`: the user agent name (typically one of `edge`, `firefox`, `chrome`, `safari`, `webkit`)
* `status`: the implementation status, which should be one of `shipped`, `indevelopment`, `experimental`, `consideration`, or an empty string to say "Not currently considered".
* `source` (optional but recommended): a short name that identifies the origin of the information. Use `feedback` to flag information that comes from review and that should override whatever other implementation status the framework might be able to retrieve automatically for the user agent under consideration.
* `date` (optional but recommended): the `YYYY-MM-DD` date at which that manually information was last reviewed. Keeping implementation information up to date, is difficult, and error prone. The information needs to be periodically checked and re-validated. The date is meant to track the last time when someone checked and validated the information.
* `comment` (optional but recommended): a comment that provides contextual information, for instance to explain why the information in platform status sources should be regarded as incorrect.
* `prefix` (optional): whether the implementation requires the use of a prefix
* `flag` (optional): whether some flag needs to be set to enable the feature

For instance, let's say that "Can I use" report that a particular feature is in development in Webkit, whereas you know that the feature has not yet been considered there; and that it does not report anything on status in Edge, whereas you know from discussion with the Edge team that it is being considered, you could add:

```json
{
  "TR": "...",
  "impl": {
    "caniuse": "...",
    "other": [
      {
        "ua": "webkit",
        "status": "",
        "source": "feedback",
        "date": "2018-03-19",
        "comment": "No public signal in Webkit for the feature, information reported by Can I Use is incorrect"
      },
      {
        "ua": "edge",
        "status": "consideration",
        "source": "insight",
        "date": "2018-03-19",
        "comment": "From discussion with the Edge team, the feature is under consideration"
      }
    ]
  }
}
```

In the previous example, the information on `webkit` will override the information reported by "Can I Use", whereas the information on `edge` will not be used if "Can I Use" asserts that the development has started or that the feature has shipped in Edge.


**Important:** As noted above, maintaining implementation information over time is difficult and error prone. Whenever possible, the implementation status of a particular feature should be automatically extracted from main sources, and the `other` mechanism should only be used as a fallback when implementation status is incorrect or not available.

## Creating a new roadmap page or a new single-page roadmap
Start from the following template
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Title of the roadmap</title>
  </head>
  <body>
    <header>
      <h1>Title of the roadmap</h1>
      <p>Description of the scope of the roadmap and to whom it matters</p>
    </header>
    <main>
      <section class="featureset well-deployed">
        <h2>Well-deployed technologies</h2>
      </section>
      <section class="featureset in-progress">
        <h2>Specifications in progress</h2>
      </section>
      <section class="featureset exploratory-work">
        <h2>Exploratory work</h2>
      </section>
      <section class="not-covered">
        <h2>Features not covered by ongoing work</h2>
        <dl>
          <dt></dt>
          <dd></dd>
        </dl>
      </section>
      <section class="discontinued">
        <h2>Discontinued features</h2>
        <dl>
          <dt></dt>
          <dd></dd>
        </dl>
      </section>
    </main>
    <script src="../js/generate.js"></script>
  </body>
</html>
```
If adding to an existing roadmap, you should also edit the `toc.json` file to add a link to that new page.

For a new single page roadmap, you also need to create a `toc.json` file as described below.

## Creating the index of a new multi-page roadmap
If you want to divide your roadmap as a multipage document, you also need to create an index page and a JSON file listing the various sub-pages.

The template for the index page is as follows:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Title of the roadmap</title>
  </head>
  <body>
    <header>
      <h1>Title of roadmap</h1>
      <p>Introduction of roadmap scope</p>
    </header>
  </body>
  <script src="../js/generate.js"></script>
</html>
```

The template for the JSON file listing sub-pages is as follows:
```json
{
  "title": "Title of the Roadmap",
  "discourse": {
    "category": "Category of the discourse instance where to post suggestions for new feature (leave empty if none)",
    "url": "https://discourse.wicg.io/"
  },
  "pages": [
    {
      "url": "subpage.html",
      "title": "Title of the subpage",
      "icon": "https://.../icon/to/use/in/the/index/page",
      "description": "One line description of the scope of the subpage"
    }
  ]
}
```

## Repository branches

The source of the roadmaps is in the `master` branch. This is the default branch of the repository, and the branch against which you should be sending pull requests. Whenever content is pushed onto the `master` branch, a Travis script will run, fetch information and implementation data for all features listed in `data`, and eventually update the `gh-pages` branch accordingly.

The `gh-pages` branch is the branch published on [`https://w3c.github.io/web-roadmaps/`](https://w3c.github.io/web-roadmaps/).

If you would like to visualize the contents of a roadmap locally as it would appear on the published version, you will need to:

1. Create a [W3C account](https://www.w3.org/accounts/request) and a [W3C API key](https://www.w3.org/users/myprofile/apikeys) if not already done.
2. Create a `config.json` file in the root of the repository that contains a `w3cApiKey` property with a valid W3C API key.
3. Run `npm run all` to update information and implementation data. This should generate `specs/tr.json` and `specs/impl.json` files. Note you'll need Node.js v8.0.0 or above and you'll need to run `npm install` first.
4. Serve the root folder of the repository over HTTP (any HTTP server should work). In particular, opening the file directly with your Web browser will not work because the JavaScript code needs to send cross origin requests, which are not supported for `file://` URLs.

## Translating a roadmap

*Note (January 2018): this part should be mostly stable now, but it may still evolve based on practical experience with translating roadmaps.*

The translator needs to provide:

* Translated versions of the HTML pages. See [Translating HTML pages](#translating-html-pages).
* Translations of specification titles, feature names, group names and other labels used in the roadmap. See [Creating a `translations.xx.json` file](#creating-a-translationsxxjson-file).
* Translations of the table of contents (the `toc.json`) file. See [Translating the `toc.json` file](#translating-the-tocjson-file).
* The list of translations in the `toc.json` file so that the framework can generate links in the footer to switch from one language to another. See [List translations in the `toc.json` file](#list-translations-in-the-tocjson-file).

To maintain translations over time, it is wise to use Git tags to create snapshots of a roadmap whenever a significant update is needed. Maintaining the translation then becomes a matter of comparing the latest snapshot with the previous one. The translator can retrieve the ZIP that contains the HTML files to translate from GitHub.

### Translating HTML pages

That is the main content that needs to be translated. A few recommendations:

* Save the translation of a page `filename.html` in the same folder, under the name `filename.xx.html` where `xx` is the BCP47 language code.
* Set the `lang` attribute of the `<html>` tag to the right value in the translated file.
* The overall structure and tags of the HTML content should be preserved. In particular, class names, `data-feature` and `data-featureid` are all important.
* The paragraph structure should be preserved too. Paragraphs are relatively independent from one another on purpose, so that they can be moved to different section as the maturity of the underlying technology evolves.

### Creating a `translations.xx.json` file

The `js/translations.xx.json` file, where `xx` is the BCP47 language code, needs to contain the translations of all specification titles, group names, feature names and other labels used within the roadmaps that need to be translated. This file is common to all roadmaps. It should respect the following structure:

```json
{
  "sections": {
    "well-deployed": "",
    "in-progress": "",
    "exploratory-work": "",
    "not-covered": "",
    "discontinued": ""
  },
  "columns": {
    "feature": "",
    "spec": "",
    "group": "",
    "maturity": "",
    "impl": "",
    "implintents": "",
    "versions": ""
  },
  "implstatus": {
    "shipped": "",
    "experimental": "",
    "indevelopment": "",
    "consideration": ""
  },
  "labels": {
    "N/A": "",
    "%feature in %spec": "",
    "Polyfills": "",
    "Home": ""
  },
  "groups": {
    "CSS Working Group": "",
    "...": ""
  },
  "specifications": {
    "CSS Animations": "",
    "...": ""
  },
  "features": {
    "audio element": "",
    "picture element": "",
    "...": ""
  }
}
```

The translations of section titles (`sections`), table columns headers (`columns`), implementation status (`implstatus`) and labels (`labels`) are required. Translations of group names, specification titles and feature names are optional, although recommended. The framework will default to English when a translation is missing.

Note the framework will also write the English version of specification titles and of group names next to their translations in the generated tables, because the English version is often used when referring to specs and groups in Web pages, regardless of the language of the page.


### Translating the `toc.json` file

Create a `toc.xx.json` file that follows the same structure as the `toc.json` file. The contents of the localized version will overwrite the same content in the `toc.json`. You do not need to duplicate content that does not need to change. For instance, in the following translation in French of the example JSON file listing sub-pages that appears earlier in this document, note that the URL of the Discourse instance and the URL and icon of the subpage have not been duplicated in the localized file:

```json
{
  "title": "Le titre de la feuille de route",
  "discourse": {
    "category": "Ma catégorie",
  },
  "pages": [
    {
      "title": "Titre de la sous-page",
      "description": "Une courte description de la sous-page"
    }
  ]
}
```

### List translations in the `toc.json` file

To add links between translations in the footer of each page, the framework needs to know which translations are available. You should add the list in a `translations` key in the `toc.json` file, for instance:

```json
{
  "title": "Title of the Roadmap",
  "discourse": {...},
  "pages": [...],
  "translations": [
    {
      "title": "Français",
      "lang": "fr"
    },
    {
      "title": "English",
      "lang": "en"
    },
    {
      "title": "中文",
      "lang": "zh"
    }
  ]
}
```

The list of translations only needs to appear in the `toc.json` file, and does not need to appear in the localized `toc.xx.json` files.
