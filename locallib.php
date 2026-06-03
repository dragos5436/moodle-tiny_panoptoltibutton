<?php
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
 * Local library functions for the Panopto TinyMCE LTI button.
 *
 * @package    tiny_panoptoltibutton
 * @copyright  2026 Panopto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Ensure the user is logged in, or perform a cross-site repost if cookies were blocked.
 *
 * @param int $courseid Course to require login for after repost succeeds.
 */
function tiny_panoptoltibutton_require_login_or_repost(int $courseid): void {
    global $PAGE, $_POST;

    $context = context_course::instance($courseid);
    $PAGE->set_pagelayout('popup');
    $PAGE->set_context($context);

    if (method_exists('panoptoblock_lti_utility', 'require_login_or_repost')) {
        panoptoblock_lti_utility::require_login_or_repost($courseid, $context);
        return;
    }

    if (!empty($_POST['repost'])) {
        unset($_POST['repost']);
    } else if (!isloggedin()) {
        header_remove('Set-Cookie');
        $output = $PAGE->get_renderer('mod_lti');
        $page = new \mod_lti\output\repost_crosssite_page($_SERVER['REQUEST_URI'], $_POST);
        echo $output->header();
        echo $output->render($page);
        echo $output->footer();
        exit;
    }

    require_login($courseid);
}
