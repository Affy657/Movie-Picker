import jsxA11y from 'eslint-plugin-jsx-a11y';

const PREFER_TAG_OVER_ROLE = jsxA11y.rules['prefer-tag-over-role'];

const COMPOSITE_CONTAINER_ROLES = new Set(['table', 'grid', 'listbox']);
const COMPOSITE_CHILD_ROLES = new Set([
  'row',
  'rowgroup',
  'cell',
  'gridcell',
  'columnheader',
  'rowheader',
  'option',
]);

function attributeNamed(opening, name) {
  return opening.attributes.find(
    (attribute) =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name.toLowerCase() === name
  );
}

function literalValue(attribute) {
  const { value } = attribute;
  if (value === null) return true;
  if (value.type === 'Literal') return value.value;
  if (value.type === 'JSXExpressionContainer' && value.expression.type === 'Literal') {
    return value.expression.value;
  }
  if (value.type === 'JSXExpressionContainer' && value.expression.type === 'TemplateLiteral') {
    const { expressions, quasis } = value.expression;
    return expressions.length === 0
      ? quasis.map((quasi) => quasi.value.cooked).join('')
      : undefined;
  }
  return undefined;
}

function roleOf(opening) {
  const attribute = attributeNamed(opening, 'role');
  const value = attribute && literalValue(attribute);
  return typeof value === 'string' ? value.toLowerCase() : undefined;
}

function elementName(opening) {
  return opening.name.type === 'JSXIdentifier' ? opening.name.name : null;
}

function isHtmlElement(opening) {
  const name = elementName(opening);
  return name !== null && /^[a-z]/.test(name);
}

function childrenOf(opening) {
  const element = opening.parent;
  return element?.type === 'JSXElement' ? element.children : [];
}

function hasChildren(opening) {
  return childrenOf(opening).length > 0;
}

function hasNamingAttribute(opening, name) {
  const attribute = attributeNamed(opening, name);
  if (!attribute) return false;
  const value = literalValue(attribute);
  if (typeof value === 'string') return value.trim() !== '';
  if (value === undefined) return attribute.value?.type === 'JSXExpressionContainer';
  return false;
}

function hasTitleChild(opening) {
  return childrenOf(opening).some(
    (child) =>
      child.type === 'JSXElement' &&
      elementName(child.openingElement) === 'title' &&
      child.children.some(
        (inner) =>
          (inner.type === 'JSXText' && inner.value.trim() !== '') ||
          (inner.type === 'JSXExpressionContainer' &&
            inner.expression.type !== 'JSXEmptyExpression')
      )
  );
}

function hasAccessibleName(opening) {
  return (
    hasNamingAttribute(opening, 'aria-labelledby') ||
    hasNamingAttribute(opening, 'aria-label') ||
    hasTitleChild(opening)
  );
}

function resolvedLiteral(expression, sourceCode) {
  if (expression.type === 'Literal') return { value: expression.value };
  if (expression.type !== 'Identifier') return undefined;
  const variable = sourceCode
    .getScope(expression)
    .references.find((reference) => reference.identifier === expression)?.resolved;
  const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
  const init = definition?.node.type === 'VariableDeclarator' ? definition.node.init : undefined;
  return init?.type === 'Literal' && definition.parent.kind === 'const'
    ? { value: init.value }
    : undefined;
}

function hiddenStateOfAttribute(opening, name, isHidden, sourceCode) {
  const attribute = attributeNamed(opening, name);
  if (!attribute) return 'visible';
  if (attribute.value === null) return isHidden(true) ? 'hidden' : 'visible';
  if (attribute.value.type === 'Literal') {
    return isHidden(attribute.value.value) ? 'hidden' : 'visible';
  }
  if (attribute.value.type === 'JSXExpressionContainer') {
    const literal = resolvedLiteral(attribute.value.expression, sourceCode);
    if (literal) return isHidden(literal.value) ? 'hidden' : 'visible';
  }
  return 'unknown';
}

function hasDisplayNone(opening) {
  const style = attributeNamed(opening, 'style');
  const expression =
    style?.value?.type === 'JSXExpressionContainer' ? style.value.expression : null;
  if (expression?.type !== 'ObjectExpression') return false;
  return expression.properties.some(
    (property) =>
      property.type === 'Property' &&
      (property.key.name ?? property.key.value) === 'display' &&
      property.value.type === 'Literal' &&
      String(property.value.value).trim().toLowerCase() === 'none'
  );
}

function ownHiddenState(opening, sourceCode) {
  const states = new Set([
    hiddenStateOfAttribute(
      opening,
      'aria-hidden',
      (value) => String(value).trim().toLowerCase() === 'true',
      sourceCode
    ),
    hiddenStateOfAttribute(opening, 'hidden', Boolean, sourceCode),
    hasDisplayNone(opening) ? 'hidden' : 'visible',
  ]);
  if (states.has('hidden')) return 'hidden';
  return states.has('unknown') ? 'unknown' : 'visible';
}

function hiddenState(opening, sourceCode) {
  let state = 'visible';
  for (let node = opening.parent; node; node = node.parent) {
    if (node.type !== 'JSXElement') continue;
    const own = ownHiddenState(node.openingElement, sourceCode);
    if (own === 'hidden') return 'hidden';
    if (own === 'unknown') state = 'unknown';
  }
  return state;
}

function hasBackgroundImageStyle(opening) {
  const style = attributeNamed(opening, 'style');
  const expression =
    style?.value?.type === 'JSXExpressionContainer' ? style.value.expression : null;
  return (
    expression?.type === 'ObjectExpression' &&
    expression.properties.some(
      (property) =>
        property.type === 'Property' &&
        (property.key.name ?? property.key.value) === 'backgroundImage'
    )
  );
}

function hasAttribute(opening, name) {
  return attributeNamed(opening, name) !== undefined;
}

function renderedDescendants(element, stopAt) {
  const found = [];
  const visit = (node) => {
    for (const child of node.children ?? []) {
      if (child.type === 'JSXElement') {
        found.push(child);
        if (!stopAt(child)) visit(child);
      } else if (child.type === 'JSXFragment') {
        visit(child);
      } else if (child.type === 'JSXExpressionContainer') {
        collectJsx(child.expression).forEach((inner) => {
          found.push(inner);
          if (!stopAt(inner)) visit(inner);
        });
      }
    }
  };
  visit(element);
  return found;
}

function collectJsx(expression) {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXElement') {
      found.push(node);
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === 'string') visit(value);
    }
  };
  visit(expression);
  return found;
}

function enclosingRoles(opening) {
  const roles = [];
  for (let node = opening.parent?.parent; node; node = node.parent) {
    if (node.type === 'JSXElement') roles.push(roleOf(node.openingElement));
  }
  return roles;
}

function isCompositeWidget(role, opening) {
  const element = opening.parent;
  if (element?.type !== 'JSXElement') return false;
  if (COMPOSITE_CONTAINER_ROLES.has(role)) {
    return renderedDescendants(element, () => false).some((descendant) =>
      COMPOSITE_CHILD_ROLES.has(roleOf(descendant.openingElement))
    );
  }
  if (COMPOSITE_CHILD_ROLES.has(role)) {
    return enclosingRoles(opening).some((ancestor) => COMPOSITE_CONTAINER_ROLES.has(ancestor));
  }
  return false;
}

function isGroupedListboxSubgroup(role, opening) {
  const element = opening.parent;
  return (
    role === 'group' &&
    element?.type === 'JSXElement' &&
    enclosingRoles(opening).includes('listbox') &&
    renderedDescendants(
      element,
      (descendant) => roleOf(descendant.openingElement) === 'listbox'
    ).some((descendant) => roleOf(descendant.openingElement) === 'option')
  );
}

function isSonarFalsePositive(opening, sourceCode) {
  const role = roleOf(opening);
  if (role === undefined) return false;
  const name = elementName(opening)?.toLowerCase() ?? null;
  return (
    (name === 'svg' &&
      (role === 'presentation' || role === 'img') &&
      hiddenState(opening, sourceCode) !== 'visible') ||
    (name === 'svg' && role === 'img' && hasAccessibleName(opening)) ||
    (role === 'status' && hasAttribute(opening, 'aria-live')) ||
    (role === 'slider' &&
      ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'].every((attribute) =>
        hasAttribute(opening, attribute)
      )) ||
    (role === 'radio' && hasAttribute(opening, 'aria-checked')) ||
    (role === 'combobox' &&
      hasAttribute(opening, 'aria-expanded') &&
      ['aria-controls', 'aria-owns', 'aria-haspopup'].some((attribute) =>
        hasAttribute(opening, attribute)
      )) ||
    (role === 'separator' && hasChildren(opening)) ||
    (role === 'img' &&
      (name === 'div' || name === 'span') &&
      (hasChildren(opening) || hasBackgroundImageStyle(opening))) ||
    isGroupedListboxSubgroup(role, opening) ||
    isCompositeWidget(role, opening)
  );
}

const sonarPreferTagOverRole = {
  meta: PREFER_TAG_OVER_ROLE.meta,
  create(context) {
    const filtered = Object.create(context, {
      report: {
        value(descriptor) {
          const opening = descriptor.node;
          if (opening?.type !== 'JSXOpeningElement') return;
          if (!isHtmlElement(opening)) return;
          if (isSonarFalsePositive(opening, context.sourceCode)) return;
          context.report(descriptor);
        },
      },
    });
    return PREFER_TAG_OVER_ROLE.create(filtered);
  },
};

const [, NONINTERACTIVE_HANDLERS] =
  jsxA11y.configs.recommended.rules['jsx-a11y/no-noninteractive-element-interactions'];

export const sonarA11yPlugin = {
  rules: {
    'prefer-tag-over-role': sonarPreferTagOverRole,
    'no-noninteractive-element-interactions':
      jsxA11y.rules['no-noninteractive-element-interactions'],
  },
};

export const sonarA11yRules = {
  'sonar-a11y/prefer-tag-over-role': 'error',
  'sonar-a11y/no-noninteractive-element-interactions': ['error', NONINTERACTIVE_HANDLERS],
};
