create extension if not exists pgcrypto;

create or replace function set_date_updated()
returns trigger as $$
begin
  new.date_updated = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  create type product_status as enum ('draft', 'active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type fulfillment_method as enum ('pickup', 'delivery');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type payment_status as enum ('unpaid', 'paid', 'refunded');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type order_payment_mode as enum ('cash', 'utang');
exception
  when duplicate_object then null;
end $$;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null unique,
  slug varchar(120) not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  date_created timestamptz not null default now(),
  date_updated timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name varchar(160) not null,
  slug varchar(180) not null unique,
  sku varchar(80) unique,
  barcode varchar(120) unique,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  cost numeric(10, 2) check (cost is null or cost >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  unit_label varchar(40) not null default 'piece',
  image_url text,
  is_featured boolean not null default false,
  status product_status not null default 'active',
  date_created timestamptz not null default now(),
  date_updated timestamptz not null default now()
);

create index if not exists products_category_id_idx on products(category_id);
create index if not exists products_status_idx on products(status);
create index if not exists products_featured_idx on products(is_featured);

alter table products add column if not exists barcode varchar(120) unique;

create table if not exists customer_orders (
  id uuid primary key default gen_random_uuid(),
  order_number varchar(40) not null unique default ('TBS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  customer_id uuid references directus_users(id) on delete set null,
  customer_name varchar(160) not null,
  customer_email varchar(255),
  customer_phone varchar(40),
  delivery_address text,
  fulfillment_method fulfillment_method not null default 'delivery',
  order_status order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_mode order_payment_mode not null default 'cash',
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  client_reference varchar(100) unique,
  notes text,
  date_created timestamptz not null default now(),
  date_updated timestamptz not null default now()
);

alter table customer_orders add column if not exists payment_mode order_payment_mode not null default 'cash';
alter table customer_orders add column if not exists customer_id uuid references directus_users(id) on delete set null;
alter table customer_orders add column if not exists client_reference varchar(100) unique;

create index if not exists customer_orders_customer_id_idx on customer_orders(customer_id);
create index if not exists customer_orders_order_status_idx on customer_orders(order_status);
create index if not exists customer_orders_payment_mode_idx on customer_orders(payment_mode);
create index if not exists customer_orders_date_created_idx on customer_orders(date_created);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references customer_orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name varchar(160) not null,
  product_sku varchar(80),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) generated always as (quantity * unit_price) stored,
  status varchar(40) not null default 'active' check (status in ('active', 'removed')),
  date_created timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on order_items(order_id);
create index if not exists order_items_product_id_idx on order_items(product_id);
create index if not exists order_items_status_idx on order_items(status);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  quantity_change integer not null,
  reason varchar(80) not null,
  notes text,
  date_created timestamptz not null default now()
);

create index if not exists inventory_movements_product_id_idx on inventory_movements(product_id);

drop trigger if exists categories_set_date_updated on categories;
create trigger categories_set_date_updated
before update on categories
for each row execute function set_date_updated();

drop trigger if exists products_set_date_updated on products;
create trigger products_set_date_updated
before update on products
for each row execute function set_date_updated();

drop trigger if exists customer_orders_set_date_updated on customer_orders;
create trigger customer_orders_set_date_updated
before update on customer_orders
for each row execute function set_date_updated();

insert into categories (name, slug, sort_order)
values
  ('Beer', 'beer', 10),
  ('Soft Drinks', 'soft-drinks', 20),
  ('Chips & Curls', 'chips-curls', 30),
  ('Canned Goods', 'canned-goods', 40),
  ('Condiments', 'condiments', 50),
  ('Rice', 'rice', 60),
  ('Feeds', 'feeds', 70),
  ('Ice Cream', 'ice-cream', 80),
  ('Toiletries', 'toiletries', 90),
  ('Others', 'others', 100)
on conflict (slug) do nothing;

insert into products (category_id, name, slug, sku, description, price, stock_quantity, unit_label, image_url, is_featured)
select categories.id, product_data.name, product_data.slug, product_data.sku, product_data.description,
       product_data.price, product_data.stock_quantity, product_data.unit_label, product_data.image_url,
       product_data.is_featured
from (
  values
    ('beer', 'San Miguel Pale Pilsen', 'san-miguel-pale-pilsen', 'BEER-SMPP', 'A cold beer option for adults, stocked for quick neighborhood pickup.', 75.00, 24, 'bottle', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80', true),
    ('soft-drinks', 'Coca-Cola Family Bottle', 'coca-cola-family-bottle', 'DRINK-COKE-FAM', 'A family-size soft drink bottle for meals, merienda, and small gatherings.', 95.00, 18, 'bottle', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80', true),
    ('chips-curls', 'Cheese Curls Pack', 'cheese-curls-pack', 'SNACK-CURLS', 'Crunchy cheese curls for snacks, baon, or quick merienda.', 18.00, 50, 'pack', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=900&q=80', true),
    ('canned-goods', 'Sardines in Tomato Sauce', 'sardines-in-tomato-sauce', 'CAN-SARDINES', 'A pantry staple for fast meals with rice.', 28.00, 36, 'can', 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80', false),
    ('condiments', 'Soy Sauce Pouch', 'soy-sauce-pouch', 'COND-SOY-POUCH', 'Small-format condiment pouch for everyday cooking and dipping.', 15.00, 40, 'pouch', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=900&q=80', false),
    ('rice', 'Premium Rice 1kg', 'premium-rice-kilo', 'RICE-PREMIUM-1KG', 'Everyday rice sold by kilo for flexible household restocking.', 62.00, 100, 'kg', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80', true),
    ('feeds', 'Chicken Feeds', 'chicken-feeds-sack', 'FEED-CHICKEN', 'Basic feeds for backyard poultry and small household needs.', 48.00, 20, 'kg', 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=80', false),
    ('ice-cream', 'Ice Cream Cup', 'ice-cream-cup', 'ICE-CREAM-CUP', 'Single-serve frozen treat for quick neighborhood snacks.', 35.00, 30, 'cup', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80', false),
    ('toiletries', 'Shampoo Sachet', 'shampoo-sachet', 'TOILETRY-SHAMPOO', 'Affordable single-use sachet for daily personal care.', 8.00, 80, 'sachet', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80', false),
    ('others', 'Instant Noodles', 'instant-noodles', 'OTHER-NOODLES', 'Quick-cook noodles for easy meals and emergency pantry stock.', 16.00, 60, 'pack', 'https://images.unsplash.com/photo-1607328874071-45a9cd600644?auto=format&fit=crop&w=900&q=80', false)
) as product_data(category_slug, name, slug, sku, description, price, stock_quantity, unit_label, image_url, is_featured)
join categories on categories.slug = product_data.category_slug
on conflict (slug) do nothing;
