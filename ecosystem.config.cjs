// PM2 process file. See docs/deploy.md.
// Production runs from a symlinked release dir (/srv/etleq/production/current);
// staging runs from a plain git checkout (/srv/etleq/staging).
module.exports = {
  apps: [
    {
      name: 'etleq-production',
      cwd: '/srv/etleq/production/current',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      exec_mode: 'cluster',
      instances: 2,
      max_memory_restart: '1G',
      kill_timeout: 10000,
      listen_timeout: 15000,
      env: {
        NODE_ENV: 'production',
        SITE_ENV: 'production',
        PORT: '3000',
      },
      out_file: '/var/log/etleq/production.out.log',
      error_file: '/var/log/etleq/production.err.log',
      time: true,
    },
    {
      name: 'etleq-staging',
      cwd: '/srv/etleq/staging',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001 -H 127.0.0.1',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        SITE_ENV: 'staging',
        PORT: '3001',
      },
      out_file: '/var/log/etleq/staging.out.log',
      error_file: '/var/log/etleq/staging.err.log',
      time: true,
    },
  ],
}
