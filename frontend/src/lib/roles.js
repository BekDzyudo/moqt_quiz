export const ROLES = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  listener: 'Tinglovchi',
}

export const homeFor = (role) => (role === 'listener' ? '/test' : '/admin')
