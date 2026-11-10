// Reemplaza temporalmente un método (por ejemplo UserModel.find) para simular fallas de la base.
// Devuelve una función que lo restaura; se usa siempre en un afterEach o en un finally.
export function stubMethod(target, name, implementation) {
  const hadOwnProperty = Object.prototype.hasOwnProperty.call(target, name);
  const original = target[name];
  target[name] = implementation;

  return () => {
    if (hadOwnProperty) target[name] = original;
    else delete target[name];
  };
}

// Errores como los que lanzaría el driver de MongoDB.
export function mongoDuplicateKeyError() {
  return Object.assign(new Error('E11000 duplicate key error (detalle interno secreto)'), {
    name: 'MongoBulkWriteError',
    code: 11000,
    keyValue: { email: 'duplicado@test.com' },
  });
}

export function mongoUnavailableError() {
  return Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:27017 (detalle interno secreto)'), {
    name: 'MongoServerSelectionError',
  });
}
