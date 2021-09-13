# SubQuery Example - Extrinsics History

This subquery will index historic extrinsic data (source, destination, amount, fees), so it can be queried by extrinsic hash

# Get Started
### 1. configure
Configure the project, i.e. ports, folders to use, etc. in `docker-compose.yml`.

Configure the node to contact (`network.endpoint`) and starting block for indexing in `project.yaml`.

### 2. install dependencies
```shell
yarn
```

### 3. generate types
```shell
yarn codegen
```

### 4. build
```shell
yarn build
```

### 5. run locally
```shell
yarn start:docker
```
