function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function isTiendaRole(role) {
  return normalizeRole(role) === "TIENDA";
}

export function isScopedRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "TIENDA" || normalized === "ADMINISTRADOR";
}

export function canFilterByOwner(role) {
  const normalized = normalizeRole(role);
  return normalized === "ADMIN" || normalized === "GERENCIA";
}

function mergeAnd(baseWhere, extraClause) {
  if (!extraClause || (typeof extraClause === "object" && Object.keys(extraClause).length === 0)) {
    return baseWhere || {};
  }

  if (!baseWhere || Object.keys(baseWhere).length === 0) {
    return extraClause;
  }

  return {
    AND: [baseWhere, extraClause],
  };
}

export function customerScopeWhere(req, baseWhere = {}, ownerUserId = "") {
  const role = normalizeRole(req?.user?.role);
  const requestedOwner = String(ownerUserId || "").trim();

  if (isScopedRole(role)) {
    return mergeAnd(baseWhere, { createdByUserId: req.user.id });
  }

  if (canFilterByOwner(role) && requestedOwner) {
    return mergeAnd(baseWhere, { createdByUserId: requestedOwner });
  }

  return baseWhere;
}

export function deviceScopeWhere(req, baseWhere = {}, ownerUserId = "") {
  const role = normalizeRole(req?.user?.role);
  const requestedOwner = String(ownerUserId || "").trim();

  if (isScopedRole(role)) {
    return mergeAnd(baseWhere, { customer: { createdByUserId: req.user.id } });
  }

  if (canFilterByOwner(role) && requestedOwner) {
    return mergeAnd(baseWhere, { customer: { createdByUserId: requestedOwner } });
  }

  return baseWhere;
}

export function paymentScopeWhere(req, baseWhere = {}, ownerUserId = "") {
  const role = normalizeRole(req?.user?.role);
  const requestedOwner = String(ownerUserId || "").trim();

  if (isScopedRole(role)) {
    return mergeAnd(baseWhere, { customer: { createdByUserId: req.user.id } });
  }

  if (canFilterByOwner(role) && requestedOwner) {
    return mergeAnd(baseWhere, { customer: { createdByUserId: requestedOwner } });
  }

  return baseWhere;
}
