document.jsXPointerEvaluator = new XPointerEvaluator ();
document.jsXPointerEvaluator.setXPointerSchemeProcessor
    ('http://suika.fam.cx/~wakaba/archive/2005/3/style/',
     'style',
     new XPointerSchemeProcessor (function (aDocument, aContext, aData) {
       var styles = aDocument.styleSheets;
       var enabled = [];
       for (var i = 0; styles.length > i; i++) {
         var style = styles[i];
         if (style.title != null) {
           if (style.title == aData) {
             style.disabled = false;
           } else {
             style.disabled = true;
             enabled.push (style);
           }
         }
       }
       return XPointerResult.createEmptyXPointerResult ();
     }));
document.jsXPointerEvaluator.setXPointerSchemeProcessor
    ('http://suika.fam.cx/~wakaba/archive/2005/3/window/',
     'title',
     new XPointerSchemeProcessor (function (aDocument, aContext, aData) {
       aDocument.title = aData;
       return XPointerResult.createEmptyXPointerResult ();
     }));
document.jsXPointerEvaluator.setXPointerSchemeProcessor
    ('http://suika.fam.cx/~wakaba/archive/2005/3/xpointer/',
     'document',
     new XPointerSchemeProcessor (function (aDocument, aContext, aData) {
       return XPointerResult.createNodeXPointerResult (aDocument);
     }));

function reevaluateFragment () {
  var uri = location.href;
  var fstart = uri.indexOf ('#');
  if (fstart == -1) return;
  var fragment = decodeURI (uri.substr (fstart + 1));
  try {
    document.jsXPointerEvaluator.evaluate (document, fragment);
  } catch (e) {
    window.status = e;
  }
};

window.onload = function () {
  var anchors = document.links;
  for (var i = 0; anchors.length > i; i++) {
    anchors[i].onclick = function (ev) {
      location.href = this.href;
      reevaluateFragment ();
      return false;
    };
  }
  
  reevaluateFragment ();
}


/* Revision: $Date: 2005/03/13 10:24:13 $ */

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright 2005 Wakaba <w@suika.fam.cx>.  All rights reserved.
 *
 * This program is free software; you can redistribute it and/or 
 * modify it under the same terms as Perl itself.
 *
 * Alternatively, the contents of this file may be used 
 * under the following terms (the "MPL/GPL/LGPL"), 
 * in which case the provisions of the MPL/GPL/LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of the MPL/GPL/LGPL, and not to allow others to
 * use your version of this file under the terms of the Perl, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the MPL/GPL/LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the Perl or the MPL/GPL/LGPL.
 *
 * "MPL/GPL/LGPL":
 *
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * <http://www.mozilla.org/MPL/>
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is xpointer-js code.
 *
 * The Initial Developer of the Original Code is Wakaba.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Wakaba <w@suika.fam.cx>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
