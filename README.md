# Framework for Web technology roadmaps

This repository hosts a framework to present roadmaps of ongoing and future Web technologies.

It aims at simplifying the creation and maintenance of such roadmaps by collecting automatically information about standardization and implementation status of features described in W3C specifications and others.

## Existing roadmaps
* [Overview of Media Technologies for the Web](https://w3c.github.io/web-roadmaps/media/)
* [Roadmap for Security technologies](https://w3c.github.io/web-roadmaps/security/)
* [Roadmap of Web Applications on Mobile](https://w3c.github.io/web-roadmaps/mobile/)

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
* for W3C specifications that have started their Recommendation track progress, the `TR` property should point to the URL of latest version of the spec; this URL will be used to collect data about the spec (standardization status, Working Groups that produce it, editors draft, etc)
* for specifications for which browser implementations are expected, the `impl` property is an object with the following optional properties:
  * `caniuse`: the name of the feature in [Can I use](http://caniuse.com/) (the one that appears in the URL after `#feat=`)
  * `chromestatus`: the number used to identify features in [Chrome Platform Status](https://www.chromestatus.com/features) (the one that appears in the URL after `features/`)
  * `edgestatus`: the name used to identify features in [Microsoft Edge web platform features status and roadmap](https://developer.microsoft.com/en-us/microsoft-edge/platform/status/) (the one that appears in the URL after `platform/status/`)
  * `webkitstatus`: the name used to identify features in [WebKit Feature Status](https://webkit.org/status/) (the one that appears in the URL after `status/#`)
* in case the reference to the specification would benefit from being more specific than the specification as a whole, the `feature` property allows to add the name of the specific feature (see e.g. the [reference to the HTMLMediaElement interface in the HTML5 specification](data/htmlmediaelement.json))
* for specifications that have not started their Recommendation track progress, the `title` property gives the title of the specification
* for specifications that have not started their Recommendation track progress, the `editors` property should point to the URL of the editors draft of the specification
* for specifications that have not started their Recommendation track progress, the `wgs` property should be an array of objects describing the groups that are producing the spec; each such object should have a `url` property with a link to the group's home page, and a `label` property with the name of the group

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
        <section>
          <h2>Features not covered by ongoing work</h2>
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
    <meta charset=utf-8>
    <title>Title of the roadmap</title>
  </head>
  <body>
    <header>
      <h1>Title of roadmap</h1>
      <p>Introduction of roadmap scope</p>
    </header>
  </body>
  <script src="../js/generate-index.js"></script>
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

1. Run the [Makefile](Makefile) to update information and implementation data. This should generate `specs/tr.json` and `specs/impl.json` files. Note you'll need Python 2.7 (and a few other libraries) for that to work.
2. Serve the root folder of the repository over HTTP (any HTTP server should work). In particular, opening the file directly with your Web browser will not work because the JavaScript code needs to send cross origin requests, which are not supported for `file://` URLs.

## Translating a roadmap

*Note (September 2017): this part is unstable, and will likely evolve based on practical experience with translating roadmaps.*

The translator needs to provide:

* Translated versions of the HTML pages. That is the main content that needs to be translated. See below for recommendations.
* Translations of the specifications titles (and feature name) featured in the roadmap **(still TBD)**
* Translations of the groups names featured in the roadmap **(still TBD)**
* Translations of the strings that appear in the framework code to populate the tables that summarize the standardization and implementation status **(still TBD)**
* For multi-page roadmaps, translations of the table of contents (the `toc.json`) file

A few recommendations to manage translations:

* Set the `lang` attribute of the `<html>` tag to the right value.
* If translations are saved in this repository, push them to a subfolder of the roadmap that is being translated, named after the language name identifier
* If saving files in a separate folder, use a `<base>` tag set to the appropriate value for relative links not to break.
* To maintain translations over time, it is wise to use Git tags to create snapshots of a roadmap whenever a significant update is needed. Maintaining the translation then becomes a matter of comparing the latest snapshot with the previous one. The translator can retrieve the ZIP that contains the HTML files to translate from GitHub.
* The overall structure and tags of the HTML content should be preserved. In particular, class names, `data-feature` and `data-featureid` are all important.
* The paragraph structure should be preserved too. Paragraphs are relatively independent from one another on purpose, so that they can be moved to different section as the maturity of the underlying technology evolves.
