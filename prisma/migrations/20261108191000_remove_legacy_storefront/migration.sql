DROP TABLE IF EXISTS
  "AddressChangeAlert",
  "DeliveryReport",
  "OrderItem",
  "Rating",
  "ProductReview",
  "SellerReview",
  "StoreFollower",
  "SearchOptimization",
  "Order",
  "Product",
  "Address",
  "Coupon",
  "Store",
  "Brand",
  "Category",
  "Service",
  "Banner",
  "PortfolioProject",
  "BlogCategory",
  "BlogPost",
  "Page",
  "NewsletterSubscriber",
  "PaymentMethodConfig",
  "ShippingMethodConfig",
  "TaxSetting",
  "SystemSetting"
CASCADE;

DELETE FROM "User"
WHERE "staffNumber" IS NULL
   OR lower(trim("role")) NOT IN (
     'nic',
     'nurse in charge',
     'nurseincharge',
     'ward staff',
     'wardstaff',
     'ward manager',
     'wardmanager',
     'admin',
     'administrator',
     'ig auditor',
     'ig/auditor',
     'igauditor'
   );

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "cart",
  DROP COLUMN IF EXISTS "image",
  DROP COLUMN IF EXISTS "authType",
  ALTER COLUMN "role" SET DEFAULT 'Ward staff';

DROP TYPE IF EXISTS "OrderStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
