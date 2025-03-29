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
  
  

