/* xpointer.js - XPointer implementation written in JavaScript */


/* Regular Expressions */
/* BUG: These expressions are less strict than the formal definition of XPointer */
var ncname = '[A-Za-z_\u00C0-\u02FF\u0370-\u203E\u2041-\uFFFD]' +
             '[A-Za-z_\u00C0-\uFFFD.0-9\u00B7-]*';
var isNCName = new RegExp ('^' + ncname + '$');
var pointerPart = new RegExp ('^(' + ncname + ')(?:' + ':(' + ncname + '))?' +
                              '\\(' + '(' + '[^()^]*(?:[^()^]|\\^[()^]' +
                                '|\\([^()^]*(?:[^()^]|\\^[()^]' +
                                  '|\\([^()^]*(?:[^()^]|\\^[()^]' +
                                    '|\\([^()^]*(?:[^()^]|\\^[()^]' +
                                      //
                                    ')*\\)' +
                                  ')*\\)' +
                                ')*\\)' +
                              ')*' + ')' + '\\)' +
                              '[\x09\x0A\x0D\x20]*');

/** Implemenetations of XPointer schemes */
function XPointerSchemeProcessor (evaluateFunction) {
  this.evaluate = evaluateFunction;
}

/** XPointer Evaluation Engine */
function XPointerEvaluator () {
  return this;
}

/** Evaluates an XPointer pointer in the context of a document.
    
    @param aDocument   A document in which the pointer is evaluated.
    @param aExpression An XPointer pointer.
    @raise XPointerShorthandNoMatchError
                       A shorthand pointer is specified but it does not
                       identify any element.
    @raise XPointerSchemeBasedNoMatchError
                       A scheme-based pointer is specified but it does not
                       identify any subresources.
    @raise XPointerSyntaxError
                       An illegal pointer is specified.
    @return XPointerResult that contains subresources identified by the poitner.
*/
XPointerEvaluator.prototype.evaluate = function (aDocument, aExpression) {
  var ptr = aExpression;
  var aContext = new XPointerSchemeContext ();
  if (isNCName.test (aExpression)) {
    var result = this.getXPointerSchemeProcessor (null, null)
                     .evaluate (aDocument, aContext, ptr);
    if (!result.hasSubresources) {
      throw new XPointerShorthandNoMatchError (aExpression);
    }
    return result;
  } else {
    while (true) {
      var nptr = ptr.replace (pointerPart, '');
      if (ptr != nptr) {
        var schemePrefix = RegExp.$1;
        var schemeLocalName = RegExp.$2;
        var schemeData = RegExp.$3;
        schemeData.replace (/^([()^])/, '$1');
        var schemeNamespaceURI;
        ptr = nptr;
        if (!schemeLocalName) {
          schemeLocalName = schemePrefix;
          schemePrefix = null;
          schemeNamespaceURI = null;
        } else {
          schemeNamespaceURI = aContext.lookupNamespaceURI (schemePrefix);
          if (!schemeNamespaceURI) {
            continue;
          }
        }
        var sp = this.getXPointerSchemeProcessor
                               (schemeNamespaceURI, schemeLocalName);
        if (!sp) {
          continue;
        }
        var result = sp.evaluate (aDocument, aContext, schemeData);
        if (result.hasSubresources) {
          return result;
        }
      } else {  /* Don't match */
        break;
      }
    }
    if (ptr.length > 0) {
      throw new XPointerSyntaxError (aExpression, ptr);
    }
    throw new XPointerSchemeBasedNoMatchError (aExpression);
  }
};
XPointerEvaluator.prototype._xpointerSchemeProcessor = {};

/** Returns a XPointer scheme processor.
    
    @param nsuri The namespace URI of the scheme name, or null if 
                 the scheme does not belong to any namespace.
    @param ln    The local name of the scheme.
    @return XPointerSchemeProcessor object for the scheme, if any, or
                 null otherwise.  If both nsuri and ln is null, then
                 a processor for shothand pointers is returned.
*/
XPointerEvaluator.prototype.getXPointerSchemeProcessor = function (nsuri, ln) {
  var ns = nsuri ? nsuri : '';
  return this._xpointerSchemeProcessor[ns]
           ? this._xpointerSchemeProcessor[ns][ln ? ln : '']
           : null;
};

/** Registers an XPointer scheme processor.
    
    @param nsuri Namespace URI of the scheme, or null if no namespace.
    @param ln    Local name of the scheme.
    @param sp    The scheme processor to register.
*/
XPointerEvaluator.prototype.setXPointerSchemeProcessor = function (nsuri, ln, sp) {
  var ns = nsuri ? nsuri : '';
  if (!this._xpointerSchemeProcessor[ns]) this._xpointerSchemeProcessor[ns] = {};
  this._xpointerSchemeProcessor[ns][ln] = sp;
};

XPointerEvaluator.prototype._xpointerSchemeProcessor[''] = {
  /* element() scheme defined by W3C Recommendation */
  element: new XPointerSchemeProcessor (function (aDocument, aContext, aData) {
    var cs = aData.split (/\x2F/);
    var el;
    if (cs[0].length > 0) {
      el = document.getElementById (cs[0]);
    } else {
      el = aDocument;
    }
    if (el) {
      CS: for (var i = 1; cs.length > i; i++) {
        var index = parseInt (cs[i]);
        var elChild = el.childNodes;
        for (var j = 0; elChild.length > j; j++) {
          var elc = elChild[j];
          if (elc.nodeType == elc.ELEMENT_NODE) {
            if (index-- == 1) {
              el = elc;
              continue CS;
            }
          }
        }
        el = null;
        break CS;
      }
    }
    return (el && (el != aDocument))
             ? XPointerResult.createNodeXPointerResult (el)
             : XPointerResult.createEmptyXPointerResult ();
  }),
  
  /* xmlns() scheme defined by W3C Recomemndation */
  xmlns: new XPointerSchemeProcessor (function (aDocument, aContext, aData) {
    var ns = aData.split (/[\x09\x0A\x0D\x20]*=[\x09\x0A\x0D\x20]*/, 2);
    if (ns[1] != null) {
      aContext.addNamespaceBinding (ns[0], ns[1]);
    }
    return XPointerResult.createEmptyXPointerResult ();
  })
};

/* Processor for shorthand pointers */
XPointerEvaluator.prototype._xpointerSchemeProcessor['']['']
    = new XPointerSchemeProcessor (function (aDocument, aContext, aData) {
  var el = aDocument.getElementById (aData);
  return XPointerResult.createNodeXPointerResult (el);
});

/** Scheme context objects, which provide namespace binding context
    
    NOTE: Future version of this class might provide more "context"
          information for scheme processors.
*/
function XPointerSchemeContext () {
  this.namespaceBinding = {
    xml: 'http://www.w3.org/XML/1998/namespace'
  };
}

/** Resolves a namespace prefix into the namespace URI associated to it.
    
    @param prefix Namespace prefix to lookup, or null for the default (unprefixed).
    @return Namespace URI or null if unbound.
*/
XPointerSchemeContext.prototype.lookupNamespaceURI = function (prefix) {
  if (prefix) {
    return this.namespaceBinding[prefix];
  } else {
    return this.namespaceBinding[''];
  }
};

/** Binds a namespace prefix to a namespace URI.  If the prefix is already
    bound to another namespace URI, that binding us overridden.
    
    @param prefix Namespace prefix or null for default (unprefixed).
    @param nsuri  Namespace URI or null to unbind.
*/
XPointerSchemeContext.prototype.addNamespaceBinding = function (prefix, nsuri) {
  if (prefix) {
    if ((prefix == 'xml') || (prefix == 'xmlns') ||
        (nsuri == 'http://www.w3.org/XML/1998/namespace') ||
        (nsuri == 'http://www.w3.org/2000/xmlns/')) {
      //
    } else {
      this.namespaceBinding[prefix] = nsuri;
    }
  } else {
    this.namespaceBinding[''] = nsuri;
  }
};

/** Result objects returned by evaluator.
    
    NOTE: Current interface and implementation is experimental. 
    
    See also the XPathResult interface of DOM Level 3 XPath.
*/
function XPointerResult () {}
XPointerResult.prototype = {
  UNORDERED_NODE_ITERATOR_TYPE: 4,
  ORDERED_NODE_ITERATOR_TYPE: 5,
  UNORDERED_NODE_SNAPSHOT_TYPE: 6,
  ORDERED_NODE_SNAPSHOT_TYPE: 7,
  ANY_ORDERED_NODE_TYPE: 8,
  FIRST_ORDERED_NODE_TYPE: 9,
  /** Any subresources are identified or not. */
  hasSubresources: false
};

/** Result types. */
XPointerResult.prototype.getResultType = function () {
  return this._xpResultType;
};

/** Result node, if the result is a node.
    
    @raise XPathException(TYPE_ERR) if resultType differs from ANY_ORDERED_NODE_TYPE
                                       or FIRST_ORDERED_NODE_TYPE.
    @return Result node object.
*/
XPointerResult.prototype.getSingleNodeValue = function () {
  if (!(this._xpResultType == this.ANY_ORDERED_NODE_TYPE) &&
      !(this._xpResultType == this.FIRST_ORDERED_NODE_TYPE)) {
    throw new XPathException (XPathException.prototype.TYPE_ERR);
  }
  return this._xpSingleNodeValue;
};

/** The number of nodes, if the result is a node list snapshot.
*/
XPointerResult.prototype.getSnapshotLength = function () {
  if (!(this._xpResultType == this.UNORDERED_NODE_SNAPSHOT_TYPE) &&
      !(this._xpResultType == this.ORDERED_NODE_SNAPSHOT_TYPE)) {
    throw new XPathException (XPathException.prototype.TYPE_ERR);
  }
  return this._xpNodeSnapshot.length;
};

/** A node item, if the result is the node list snapshot. 
*/
XPointerResult.prototype.snapshotItem = function (index) {
  if (!(this._xpResultType == this.UNORDERED_NODE_SNAPSHOT_TYPE) &&
      !(this._xpResultType == this.ORDERED_NODE_SNAPSHOT_TYPE)) {
    throw new XPathException (XPathException.prototype.TYPE_ERR);
  }
  return this._xpNodeSnapshot[index];
};

XPointerResult.createNodeXPointerResult = function (el) {
  var result = new XPointerResult ();
  result._xpResultType = XPointerResult.prototype.ANY_ORDERED_NODE_TYPE;
  if (el) {
    result._xpSingleNodeValue = result;
    result.hasSubresources = true;
  }
  return result;
}

XPointerResult.createEmptyXPointerResult = function () {
  var result = new XPointerResult ();
  result._xpResultType = XPointerResult.prototype.ANY_ORDERED_NODE_TYPE;
  return result;
}

XPointerResult.createNodeSnapshotXPointerResult = function () {
  var result = new XPointerResult ();
  result._xpResultType = XPointerResult.prototype.UNORDERED_NODE_SNAPSHOT_TYPE;
  result.hasSubresources = true;
  return result;
}

/* XPointer Framework Errors */

function XPointerSyntaxError (aExpression, ptr) {
  this.pointer = aExpression;
  this.illegalPointerFragment = ptr;
  return this;
}
XPointerSyntaxError.prototype.toString = function () {
  return 'Broken XPointer: "' + this.illegalPointerFragment + '"';
};

function XPointerShorthandNoMatchError (aExpression) {
  this.pointer = aExpression;
  return this;
}
XPointerShorthandNoMatchError.prototype.toString = function () {
  return 'There is no element with ID "' + this.pointer + '"';
};

function XPointerSchemeBasedNoMatchError (aExpression) {
  this.pointer = aExpression;
  return this;
}
XPointerSchemeBasedNoMatchError.prototype.toString = function () {
  return 'Pointer "' + this.pointer + '" failed to identify subresources';
};


/* DOM Level 3 XPath */
function XPathException (code) {
  this.code = code;
}
XPathException.prototype.INVALID_EXPRESSION_ERR = 51;
XPathException.prototype.TYPE_ERR = 52;
XPathException.prototype.toString = function () {
  if (this.code == this.INVALID_EXPRESSION_ERR) {
    return "The expression cannot be converted to return the specified type";
  } else if (this.code == this.TYPE_ERR) {
    return "The expression has a syntax error or contains specialized " +
           "extension functions or variables not supported by this implementation";
  } else {
    return "Unknown error: " + this.code;
  }
};


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
