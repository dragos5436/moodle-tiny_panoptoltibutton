// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package     tiny_panoptoltibutton
 * @copyright   2023 Panopto
 * @license     GPL v3
 */

/**
 * @module moodle-tiny_panoptoltibutton
 */

/**
 * tinymce text editor LTI activities plugin
 *
 * @namespace panopto_tinymce_panoptoltibutton
 * @class     Button
 */

var panopto_tinymce_panoptoltibutton = {
    PlacementStrategyFactory: function () {
        this.strategyFor = function (item, course, resourceLinkId, tool, wwwroot) {

            var StrategyClass = panopto_tinymce_panoptoltibutton.EmbeddedContentRenderingStrategy;

            if (   item.mediaType === 'application/vnd.ims.lti.v1.ltilink'
                || item.mediaType === 'application\\/vnd.ims.lti.v1.ltilink'
                || item.placementAdvice) {
                StrategyClass = panopto_tinymce_panoptoltibutton.IframeRenderingStrategy;

                if (item.placementAdvice || item.iframe) {
                    let presentationTarget = item.placementAdvice?.presentationDocumentTarget
                        ? item.placementAdvice.presentationDocumentTarget
                        : item.thumbnail
                            ? "frame"
                            : "iframe";

                    switch (presentationTarget) {
                        case 'iframe':
                            StrategyClass = panopto_tinymce_panoptoltibutton.IframeRenderingStrategy;
                            break;
                        case 'embed':
                        case 'frame':
                        case 'window':
                        case 'popup':
                        case 'overlay':
                            StrategyClass = panopto_tinymce_panoptoltibutton.EmbeddedContentRenderingStrategy;
                            break;
                        default:
                            alert('Unsupported presentation target: '
                                    + item.placementAdvice.presentationDocumentTarget);
                            break;
                    }
                }
            }

            var strategy = new StrategyClass(
                item,
                course,
                resourceLinkId,
                tool,
                wwwroot,
            );

            return strategy;
        };
    },

    EmbeddedContentRenderingStrategy: function (item, course, resourceLinkId, tool, wwwroot) {

        var launchUrl = wwwroot
                + '/lib/editor/tiny/plugins/panoptoltibutton/view.php?course='
                + encodeURIComponent(course)
                + '&ltitypeid=' + encodeURIComponent(tool.id)
                + '&resourcelinkid=' + encodeURIComponent(resourceLinkId)
                + '&custom=' + encodeURIComponent(JSON.stringify(item.custom || {}));

        if (item.url) {
            launchUrl += '&contenturl=' + encodeURIComponent(item.url);
        }

        // Store a safe, local launch marker instead of an iframe. Moodle's normal
        // HTML purification preserves this link while editing and displaying it.
        var title = Handlebars.escapeExpression(item.title || 'Panopto content');
        var href = Handlebars.escapeExpression(launchUrl);
        var contentUrl = item.url ? Handlebars.escapeExpression(item.url) : '';
        var target = item.placementAdvice && item.placementAdvice.windowTarget
            ? Handlebars.escapeExpression(item.placementAdvice.windowTarget)
            : '_blank';

        var content = '<a class="panopto-embed" data-panopto-embed="1"'
                + ' data-panopto-course-id="' + Handlebars.escapeExpression(course) + '"'
                + ' data-panopto-lti-type-id="' + Handlebars.escapeExpression(tool.id) + '"'
                + ' data-panopto-resource-link-id="' + Handlebars.escapeExpression(resourceLinkId) + '"'
                + (contentUrl ? ' data-panopto-content-url="' + contentUrl + '"' : '')
                + ' href="' + href + '" target="' + target + '" rel="noopener">'
                + title + '</a>';

        this.toHtml = function () {
            return content;
        };

    },

    IframeRenderingStrategy: function (item, course,
            resourceLinkId, tool, wwwroot) {

        var template;

        // If the item URL is the same as the LTI Launch URL (or Content-Item request), we assume we need
        // to make an LTI Launch request.
        if (   item.url !== tool.baseurl
            && item.url !== tool.config.toolurl_ContentItemSelectionRequest) {
            item.useCustomUrl = true;
        }

        let displayWidth = item.placementAdvice?.displayWidth
            ? item.placementAdvice.displayWidth
            : item.iframe?.width;

        let displayHeight = item.placementAdvice?.displayHeight
            ? item.placementAdvice.displayHeight
            : item.iframe?.height;

        template = Handlebars.compile('<a class="panopto-embed" data-panopto-embed="1" href="{{wwwroot}}/lib/editor/tiny/plugins/panoptoltibutton/view.php?course={{courseId}}'
                + '&ltitypeid={{ltiTypeId}}&custom={{custom}}'
                + '{{#if item.useCustomUrl}}&contenturl={{item.url}}{{/if}}'
                + '&resourcelinkid={{resourcelinkid}}" target="_blank" rel="noopener"'
                + ' data-panopto-course-id="{{courseId}}"'
                + ' data-panopto-lti-type-id="{{ltiTypeId}}"'
                + ' data-panopto-resource-link-id="{{resourcelinkid}}"'
                + '>Panopto content</a>'
                );

        this.toHtml = function () {
            return template({
                wwwroot: wwwroot,
                item: item,
                custom: JSON.stringify(item.custom),
                courseId: course,
                resourcelinkid: resourceLinkId,
                ltiTypeId: tool.id,
                displayHeight: displayHeight,
                displayWidth: displayWidth,
            });
        };
    }
};