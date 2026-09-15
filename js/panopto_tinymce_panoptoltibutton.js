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
    getItemTitle: function (item) {
        var title = item.title || item.name || item.label || item.text;
        if (!title) {
            return 'Panopto content';
        }

        return String(title).replace(/<[^>]*>/g, '').trim() || 'Panopto content';
    },

    encodeCustomData: function (custom) {
        var json = JSON.stringify(custom || {});
        return btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    },

    buildLaunchUrl: function (item, course, resourceLinkId, tool, wwwroot, safePayload) {
        var params = [
            'course=' + encodeURIComponent(course),
            'ltitypeid=' + encodeURIComponent(tool.id),
            'resourcelinkid=' + encodeURIComponent(resourceLinkId),
        ];

        if (safePayload) {
            params.splice(2, 0, 'custom_b64='
                + panopto_tinymce_panoptoltibutton.encodeCustomData(item.custom));
        } else {
            params.splice(2, 0, 'custom='
                + encodeURIComponent(JSON.stringify(item.custom || {})));
        }

        if (item.url) {
            params.push('contenturl=' + encodeURIComponent(item.url));
        }

        return wwwroot
            + '/lib/editor/tiny/plugins/panoptoltibutton/view.php?'
            + params.join('&');
    },

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

    EmbeddedContentRenderingStrategy: function (item, course, resourceLinkId, tool, wwwroot, safePayload) {

        var launchUrl = panopto_tinymce_panoptoltibutton.buildLaunchUrl(
            item,
            course,
            resourceLinkId,
            tool,
            wwwroot,
            safePayload
        );

        // Store a safe, local launch marker instead of an iframe. Moodle's normal
        // HTML purification preserves this link while editing and displaying it.
        var title = Handlebars.escapeExpression(
            panopto_tinymce_panoptoltibutton.getItemTitle(item)
        );
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
            resourceLinkId, tool, wwwroot, safePayload) {

        // If the item URL is the same as the LTI Launch URL (or Content-Item request), we assume we need
        // to make an LTI Launch request.
        if (   item.url !== tool.baseurl
            && item.url !== tool.config.toolurl_ContentItemSelectionRequest) {
            item.useCustomUrl = true;
        }

        var launchUrl = panopto_tinymce_panoptoltibutton.buildLaunchUrl(
            item,
            course,
            resourceLinkId,
            tool,
            wwwroot,
            safePayload
        );
        var title = Handlebars.escapeExpression(
            panopto_tinymce_panoptoltibutton.getItemTitle(item)
        );

        this.toHtml = function () {
            if (!safePayload) {
                return '<iframe src="' + Handlebars.escapeExpression(launchUrl)
                    + '" allowfullscreen="true"></iframe>';
            }

            return '<a class="panopto-embed" data-panopto-embed="1"'
                + ' data-panopto-course-id="' + Handlebars.escapeExpression(course) + '"'
                + ' data-panopto-lti-type-id="' + Handlebars.escapeExpression(tool.id) + '"'
                + ' data-panopto-resource-link-id="' + Handlebars.escapeExpression(resourceLinkId) + '"'
                + ' href="' + Handlebars.escapeExpression(launchUrl)
                + '" target="_blank" rel="noopener">'
                + title + '</a>';
        };
    }
};