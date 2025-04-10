const LoadDefaults = import("../config");

export const loadDefaultData  = new sst.Linkable("LoadDefault", {  
  properties: { value: LoadDefaults}
});

export const brainsOS_systemData = new sst.aws.Dynamo("brainsOS_systemData", {
  fields: {
    userId: "string",
    typeName: "string",
  },
  primaryIndex: { hashKey: "userId", rangeKey: "typeName" }
})

export const brainsOS_userData = new sst.aws.Dynamo("brainsOS_userData", {
    fields: {
      userId: "string",
      typeName: "string",
    },
    primaryIndex: { hashKey: "userId", rangeKey: "typeName" }
  });
    
export const brainsOS_RDS_Vpc = new sst.aws.Vpc("brainsOS_RDS_Vpc", { bastion: true, nat: "ec2" });
export const brainsOS_RDS_Aurora = new sst.aws.Aurora("brainsOS_RDS_Aurora", {
    engine: "postgres",
    dataApi: true,
    vpc: brainsOS_RDS_Vpc,
    scaling: {
      min: "0 ACU",
      max: "2 ACU"
    },
  });
