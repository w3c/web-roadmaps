# Framework for Web technology roadmaps

This repository hosts a framework to present roadmaps of ongoing and future Web technologies.

It aims at simplifying the creation and maintenance of such roadmaps by collecting automatically information about standardization and implementation status of features described in W3C specifications and others.

## Existing roadmaps
* [Roadmap of Media Technologies for the Web](https://w3c.github.io/media-web-roadmap/media/)
* [Roadmap for Security technologies](https://w3c.github.io/media-web-roadmap/security/)

## Overview of the framework

A roadmap is a collection of features that makes up a consistent set of technologies used to build a particular type of applications (e.g. media applications, games) or to promote a particular aspect of application development (e.g. security). Each feature is described in prose to explain its relevant to the theme of the roadmap. From that prose, the framework generates a table summarizing the standardization and implementation status of the specification(s) that define(s) the said feature.

A given roadmap is structured in 4 sections describing the high-level status of the described features:
* ''Well-deployed technologies'' are technologies that are finished or nearly finished (e.g. CR and beyond in the W3C Rec track) and that have already found significant adoption among implementations;
* ''Specifications in progress'' list features that have already started their standardization track progress;
* ''Exploratory work'' groups features described in specifications prior to their proper standardization work
* '' Features not covered by ongoing work' identify functionalities that are known to be needed for some use cases, but that no existing specification adequately covers

While the pages are generated dynamically in the browser, it is likely preferable to publish exported versions of the roadmaps since the framework has not been optimized for performance.

## Adding a feature to a roadmap

A feature is roughly speaking a piece of technology that the target audience of the document would recognize as something they need to build the product they are interested in.

For the 3 first categories of features described above, a feature comes with one or more specifications that covers it. The process to add a feature to a roadmap or add a specification to an existing feature is as follows:
* a feature is defined in an encompassing HTML element (typically `<p>` or `<div>`) by adding a `data-feature` attribute to it with the name of the feature as its value. For instance, `<p data-feature='Video capture'></p>` will serve as the container for the prose describing the said feature and the specs that cover it
* each spec that provides the hook for the said feature needs to be listed in that container element with a `<a>` tag containing a `data-featureid` attribute, whose value is a shortname for the specification that refers to the JSON file described below. For instance, adding `<a data-featureid='getusermedia'>the Media Capture and Streams API</a>` to the paragraph above indicates that the specification described by the `getusermedia.json` file provides a way to implement the "video capture" feature
* the [data](data/) directory contains a JSON file that describes the various specifications that provides the hooks relevant to the various features; that JSON file follows a [format described below](#json-format-for-describing-specifications).

Once the feature has been added, you should run the [Makefile](Makefile) to fetch the associated standardization and implementation status data for the said specification.

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
<html>
    <meta charset="utf-8">
    <header>
      <h1>Title of the roadmap</h1>
      <p>Description of the scope of the roadmap and to whom it matters</p>
    </header>
    <main>
      <section class="featureset well-deployed">
          <h2>Well-deployed technologies</h3>
        </section>
        <section class="featureset in-progress">
          <h2>Specifications in progress</h3>
        </section>
        <section class="featureset exploratory-work">
          <h2>Exploratory work</h3>
        </section>
        <section>
          <h2>Features not covered by ongoing work</h3>
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
<!doctye html>
<html>
  <meta charset=utf-8>
  <header>
    <h1>Title of roadmap</h1>
                <p>
                    Introduction of roadmap scope
                </p>
  </header>
  <script src="../js/generate-index.js"></script>
</html>
```

The template for the JSON file listing sub-pages is as follows:
```json
{
    "title": "Title of the Roadmap",
    "discourse": {"category": "Category of the discourse instance where to post suggestions for new feature (leave empty if none)", "url": "https://discourse.wicg.io/"},
    "pages": [
    {
     "url":"subpage.html",
     "title":"Title of the subpage",
     "icon":"https://...", // icon to use in the index of the page
     "description":"One line description of the scope of the subpage"
    }]
}
```