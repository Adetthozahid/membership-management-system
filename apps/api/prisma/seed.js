const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const roles = [
  ["Super Admin", "super-admin", "Full system access"],
  ["Admin", "admin", "Administrative operations access"],
  ["Accountant", "accountant", "Finance and payment management"],
  ["Committee Manager", "committee-manager", "Committee and governance management"],
  ["Content Manager", "content-manager", "Content publishing management"],
  ["Election Officer", "election-officer", "Election workflow management"],
  ["Member", "member", "Member self-service access"]
];

const permissions = [
  ["admin", "access", "Access admin area"],
  ["member", "access", "Access member area"],
  ["users", "read", "Read users"],
  ["users", "manage", "Manage users"],
  ["roles", "read", "Read roles and permissions"],
  ["roles", "manage", "Manage roles and permissions"],
  ["members", "read", "Read members"],
  ["members", "manage", "Manage members"],
  ["membership_types", "read", "Read membership types"],
  ["membership_types", "manage", "Manage membership types"],
  ["form_builder", "read", "Read dynamic registration forms"],
  ["form_builder", "manage", "Manage dynamic registration forms"],
  ["payments", "read", "Read payments"],
  ["payments", "manage", "Manage payments"],
  ["committees", "read", "Read committees"],
  ["committees", "manage", "Manage committees"],
  ["content", "read", "Read content"],
  ["content", "manage", "Manage content"],
  ["elections", "read", "Read elections"],
  ["elections", "manage", "Manage elections"],
  ["audit", "read", "Read audit logs"]
];

const rolePermissionMap = {
  "super-admin": permissions.map(([module, action]) => `${module}:${action}`),
  admin: [
    "admin:access",
    "users:read",
    "members:read",
    "members:manage",
    "membership_types:read",
    "membership_types:manage",
    "form_builder:read",
    "form_builder:manage",
    "payments:read",
    "committees:read",
    "content:read",
    "elections:read",
    "audit:read"
  ],
  accountant: ["admin:access", "members:read", "membership_types:read", "payments:read", "payments:manage"],
  "committee-manager": ["admin:access", "members:read", "committees:read", "committees:manage"],
  "content-manager": ["admin:access", "content:read", "content:manage"],
  "election-officer": ["admin:access", "members:read", "elections:read", "elections:manage"],
  member: ["member:access"]
};

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!email || !password) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required to seed the first Super Admin.");
  }

  const roleRecords = new Map();
  for (const [name, slug, description] of roles) {
    const role = await prisma.role.upsert({
      where: { slug },
      update: { name, description, isSystem: true },
      create: { name, slug, description, isSystem: true }
    });
    roleRecords.set(slug, role);
  }

  const permissionRecords = new Map();
  for (const [module, action, description] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { module_action: { module, action } },
      update: { description },
      create: { module, action, description }
    });
    permissionRecords.set(`${module}:${action}`, permission);
  }

  for (const [roleSlug, grants] of Object.entries(rolePermissionMap)) {
    const role = roleRecords.get(roleSlug);
    for (const grant of grants) {
      const permission = permissionRecords.get(grant);
      if (!role || !permission) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      fullName,
      passwordHash,
      isActive: true
    },
    create: {
      email: email.toLowerCase(),
      fullName,
      passwordHash,
      isActive: true
    }
  });

  const superAdminRole = roleRecords.get("super-admin");
  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRole.id
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      module: "auth",
      action: "seed_super_admin",
      entityType: "User",
      entityId: superAdmin.id
    }
  });

  await prisma.form.upsert({
    where: { code: "registration" },
    update: {
      name: "Registration",
      description: "Default public member registration form.",
      active: true,
      system: true
    },
    create: {
      id: "registration",
      name: "Registration",
      code: "registration",
      description: "Default public member registration form.",
      active: true,
      system: true
    }
  });

  const socialSection = await prisma.formSection.upsert({
    where: { id: "registration-social-links" },
    update: {
      title: "Social Links",
      description: "Public profile links shown on member cards.",
      sortOrder: 3,
      active: true
    },
    create: {
      id: "registration-social-links",
      formId: "registration",
      title: "Social Links",
      description: "Public profile links shown on member cards.",
      sortOrder: 3,
      active: true
    }
  });

  const socialFields = [
    ["Website", "website_url", "Personal website URL", 0],
    ["Facebook", "facebook_url", "Facebook profile URL", 1],
    ["Instagram", "instagram_url", "Instagram profile URL", 2],
    ["LinkedIn", "linkedin_url", "LinkedIn profile URL", 3]
  ];

  for (const [label, key, placeholder, sortOrder] of socialFields) {
    await prisma.formField.upsert({
      where: { key },
      update: {
        sectionId: socialSection.id,
        label,
        placeholder,
        type: "text",
        required: false,
        publicVisible: true,
        memberEditable: true,
        adminOnly: false,
        active: true,
        sortOrder
      },
      create: {
        sectionId: socialSection.id,
        label,
        key,
        placeholder,
        type: "text",
        required: false,
        publicVisible: true,
        memberEditable: true,
        adminOnly: false,
        active: true,
        sortOrder
      }
    });
  }

  console.log(`Seeded roles, permissions, and Super Admin: ${email.toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
