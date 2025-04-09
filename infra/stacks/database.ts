const LoadDefaults = import("../config");

export const loadDefaultData  = new sst.Linkable("LoadDefault", {  
  properties: { value: LoadDefaults}
});

export const systemData = new sst.aws.Dynamo("systemData", {
  fields: {
    userId: "string",
    typeName: "string",
  },
  primaryIndex: { hashKey: "userId", rangeKey: "typeName" }
})

export const userData = new sst.aws.Dynamo("userData", {
    fields: {
      userId: "string",
      typeName: "string",
    },
    primaryIndex: { hashKey: "userId", rangeKey: "typeName" }
  });
    
export const BrainsOSRDSVpc = new sst.aws.Vpc("BrainsOSRDSVpc", { bastion: true, nat: "ec2" });
export const BrainsOSAuroraRDS = new sst.aws.Aurora("BrainsOSAuroraRDS", {
    engine: "postgres",
    dataApi: true,
    vpc: BrainsOSRDSVpc,
    scaling: {
      min: "0 ACU",
      max: "2 ACU"
    },
  });
