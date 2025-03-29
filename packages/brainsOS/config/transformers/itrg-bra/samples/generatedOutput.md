
    digraph refArchitecture {
      node [fontname="Helvetica,Arial,sans-serif" width=2 height=0.8];
      edge [fontname="Helvetica,Arial,sans-serif"];
  
    subgraph cluster_defining {
      bgcolor="lightsteelblue2";
      label="Defining Capabilities";
      labeljust=r;
      fontcolor="black";
      style=solid;
      fontname="Helvetica,Arial,sans-serif";
      ranksep=0.2;
      fontsize=12;
  
      subgraph cluster_vs1 {
        fillcolor="white";
        fontcolor="black";
        style="filled";
        label="Business Development and Marketing";
        labeljust=c;
        fontsize=16;
        node [shape=box fillcolor="red" style="filled"];
    
        subgraph cluster_vs1a {
          fillcolor="skyblue3";
          label="Market\nAnalysis";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n1A1 [label="Competitor\nAnalysis" tooltip="Identifying and analyzing key competitors and their strategies."];
          n1A2 [label="Market\nSegmentation" tooltip="Dividing the market into distinct groups based on characteristics like industry, size, or needs."];
          n1A3 [label="Market\nTrends" tooltip="Identifying emerging trends and opportunities in the market."];
          n1A1 -> n1A2 [style=invis];
          n1A2 -> n1A3 [style=invis];
        }

        subgraph cluster_vs1b {
          fillcolor="skyblue3";
          label="Mktg. &\nPromotion";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n1B1 [label="Lead\nGeneration" tooltip="A sample level 2 capablity."];
          n1B2 [label="Proposal\nDev." tooltip="Identifying and nurturing potential clients through networking and outreach."];
          n1B1 -> n1B2 [style=invis];
        }

        subgraph cluster_vs1c {
          fillcolor="skyblue3";
          label="Proposal\nDev.";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n1C1 [label="Proposal Dev.\nSub 2" tooltip="A sample level 2 capablity."];
          n1C2 [label="Proposal Dev.\nSub 3" tooltip="A sample level 2 capablity."];
          n1C3 [label="Proposal\nDev." tooltip="A sample level 2 capablity."];
          n1C1 -> n1C2 [style=invis];
          n1C2 -> n1C3 [style=invis];
        }

        subgraph cluster_vs1d {
          fillcolor="skyblue3";
          label="Network\nBuilding";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n1D1 [label="Network Building\nSub 1" tooltip="A sample level 2 capablity."];
          n1D2 [label="Network Building\nSub 2" tooltip="A sample level 2 capablity."];
          n1D3 [label="Network Building\nSub 3" tooltip="A sample level 2 capablity."];
          n1D1 -> n1D2 [style=invis];
          n1D2 -> n1D3 [style=invis];
        }
      }

      subgraph cluster_vs2 {
        fillcolor="white";
        fontcolor="black";
        style="filled";
        label="Client Intake and Onboarding";
        labeljust=c;
        fontsize=16;
        node [shape=box fillcolor="red" style="filled"];
    
        subgraph cluster_vs2a {
          fillcolor="skyblue3";
          label="Conflict\nChecking";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n2A1 [label="Conflict Checking\nSub 1" tooltip="A sample level 2 capablity."];
          n2A2 [label="Conflict Checking\nSub 2" tooltip="A sample level 2 capablity."];
          n2A3 [label="Conflict Checking\nSub 3" tooltip="A sample level 2 capablity."];
          n2A1 -> n2A2 [style=invis];
          n2A2 -> n2A3 [style=invis];
        }

        subgraph cluster_vs2b {
          fillcolor="skyblue3";
          label="Client Due\nDiligence";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n2B1 [label="Client Due Diligence\nSub 1" tooltip="A sample level 2 capablity."];
          n2B2 [label="Client Due Diligence\nSub 2" tooltip="A sample level 2 capablity."];
          n2B3 [label="Client Due Diligence\nSub 3" tooltip="A sample level 2 capablity."];
          n2B1 -> n2B2 [style=invis];
          n2B2 -> n2B3 [style=invis];
        }

        subgraph cluster_vs2c {
          fillcolor="skyblue3";
          label="Engagement\nMgmt.";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n2C1 [label="Engagement Mgmt.\nSub 1" tooltip="A sample level 2 capablity."];
          n2C2 [label="Engagement Mgmt.\nSub 2" tooltip="A sample level 2 capablity."];
          n2C3 [label="Level 2\nCapability" tooltip="A sample level 2 capablity."];
          n2C1 -> n2C2 [style=invis];
          n2C2 -> n2C3 [style=invis];
        }

        subgraph cluster_vs2d {
          fillcolor="skyblue3";
          label="Client\nMgmt.";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n2D1 [label="Client Mgmt.\nSub 1" tooltip="A sample level 2 capablity."];
          n2D2 [label="Client Mgmt.\nSub 2" tooltip="A sample level 2 capablity."];
          n2D3 [label="Client Mgmt.\nSub 3" tooltip="A sample level 2 capablity."];
          n2D1 -> n2D2 [style=invis];
          n2D2 -> n2D3 [style=invis];
        }

        subgraph cluster_vs2e {
          fillcolor="skyblue3";
          label="Initial\nConsultation";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n2E1 [label="Initial Consultation\nSub 1" tooltip="A sample level 2 capablity."];
          n2E2 [label="Initial Consultation\nSub 2" tooltip="A sample level 2 capablity."];
          n2E3 [label="Initial Consultation\nSub 3" tooltip="A sample level 2 capablity."];
          n2E1 -> n2E2 [style=invis];
          n2E2 -> n2E3 [style=invis];
        }
      }

      subgraph cluster_vs3 {
        fillcolor="white";
        fontcolor="black";
        style="filled";
        label="Legal Service Delivery";
        labeljust=c;
        fontsize=16;
        node [shape=box fillcolor="red" style="filled"];
    
        subgraph cluster_vs3a {
          fillcolor="skyblue3";
          label="Legal\nResearch";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n3A1 [label="Legal Research\nSub 1" tooltip="A sample level 2 capablity."];
          n3A2 [label="Legal Research\nSub 2" tooltip="A sample level 2 capablity."];
          n3A3 [label="Legal Research\nSub 3" tooltip="A sample level 2 capablity."];
          n3A1 -> n3A2 [style=invis];
          n3A2 -> n3A3 [style=invis];
        }

        subgraph cluster_vs3b {
          fillcolor="skyblue3";
          label="Case Srategy\nDev.";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n3B1 [label="Case Srategy Dev.\nSub 1" tooltip="A sample level 2 capablity."];
          n3B2 [label="Case Srategy Dev.\nSub 2" tooltip="A sample level 2 capablity."];
          n3B3 [label="Case Srategy Dev.\nSub 3" tooltip="A sample level 2 capablity."];
          n3B1 -> n3B2 [style=invis];
          n3B2 -> n3B3 [style=invis];
        }

        subgraph cluster_vs3c {
          fillcolor="skyblue3";
          label="Document Drafting\n& Review";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n3C1 [label="Level 2\nCapability" tooltip="A sample level 2 capablity."];
          n3C2 [label="Document Drafting &\nReview Sub 2" tooltip="A sample level 2 capablity."];
          n3C3 [label="Document Drafting &\nReview Sub 3" tooltip="A sample level 2 capablity."];
          n3C1 -> n3C2 [style=invis];
          n3C2 -> n3C3 [style=invis];
        }

        subgraph cluster_vs3d {
          fillcolor="skyblue3";
          label="Client\nRepresentation";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n3D1 [label="Client Representation\nSub 1" tooltip="A sample level 2 capablity."];
          n3D2 [label="Client Representation\nSub 2" tooltip="A sample level 2 capablity."];
          n3D3 [label="Level 2\nCapability" tooltip="A sample level 2 capablity."];
          n3D1 -> n3D2 [style=invis];
          n3D2 -> n3D3 [style=invis];
        }

        subgraph cluster_vs3e {
          fillcolor="skyblue3";
          label="Case\nMgmt.";
          fontcolor="black";
          style="filled";
          node [shape=box fillcolor="lightskyblue" style="filled"];
                n3E1 [label="Case Mgmt.\nSub 1" tooltip="A sample level 2 capablity."];
          n3E2 [label="Case Mgmt.\nSub 2" tooltip="A sample level 2 capablity."];
          n3E3 [label="Level 2\nCapability" tooltip="A sample level 2 capablity."];
          n3E1 -> n3E2 [style=invis];
          n3E2 -> n3E3 [style=invis];
        }
      }
    }

    subgraph cluster_shared {
      bgcolor="grey86";
      label="Shared Capabilities";
      fontcolor="black";
      style=solid;
      fontname="Helvetica,Arial,sans-serif";
      fontsize=12;
      ranksep=0.2;
      rankdir=TB;
      labeljust=r;
  
      subgraph cluster_shared1 {
        fillcolor="skyblue3";
        label="Knowledge Management";
        fontcolor="black";
        style="filled";
        labeljust=c;
        fontsize=16;
        node [shape=box fillcolor="lightskyblue" style="filled"];
            ns1A [label="Knowledge Mgmt.\nSub 1" tooltip="A sample level 2 capablity."];
        ns1B [label="Knowledge Mgmt.\nSub 2" tooltip="A sample level 2 capablity."];
        ns1C [label="Knowledge Mgmt.\nSub 3" tooltip="A sample level 2 capablity."];
      }

      subgraph cluster_shared2 {
        fillcolor="skyblue3";
        label="Compliance and Risk Management";
        fontcolor="black";
        style="filled";
        labeljust=c;
        fontsize=16;
        node [shape=box fillcolor="lightskyblue" style="filled"];
            ns2A [label="Compliance & Risk\nMgmt. Sub 1" tooltip="A sample level 2 capablity."];
        ns2B [label="Compliance & Risk\nMgmt. Sub 2" tooltip="A sample level 2 capablity."];
        ns2C [label="Level 2\nCapability" tooltip="A sample level 2 capablity."];
      }

      subgraph cluster_shared3 {
        fillcolor="skyblue3";
        label="Information Technology";
        fontcolor="black";
        style="filled";
        labeljust=c;
        fontsize=16;
        node [shape=box fillcolor="lightskyblue" style="filled"];
            ns3A [label="IT Sub\n1" tooltip="A sample level 2 capablity."];
        ns3B [label="IT Sub\n2" tooltip="A sample level 2 capablity."];
        ns3C [label="IT Sub\n3" tooltip="A sample level 2 capablity."];
      }

      subgraph cluster_shared4 {
        fillcolor="skyblue3";
        label="Human Resources Management";
        fontcolor="black";
        style="filled";
        labeljust=c;
        fontsize=16;
        node [shape=box fillcolor="lightskyblue" style="filled"];
            ns4A [label="HR Mgmt.\nSub 1" tooltip="A sample level 2 capablity."];
        ns4B [label="HR Mgmt.\nSub 2" tooltip="A sample level 2 capablity."];
        ns4C [label="HR Mgmt.\nSub 3" tooltip="A sample level 2 capablity."];
      }
    }

    subgraph cluster_enabling {
      bgcolor="lightsteelblue2";
      label="Enabling Capabilities";
      fontsize=12;
      fontcolor="black";
      style=solid;
      fontname="Helvetica,Arial,sans-serif";
      ranksep=0.2;
      rankdir=TB;
      labeljust=r;

      node [shape=box fillcolor="skyblue3" style="filled" width=2.75 height=0.8 fontsize=16];
    n1A3 -> ns1A [style=invis];
  ns4C -> en1 [style=invis];
      en1 [label="Organizational\nGovernance" tooltip=""];
      en1 -> en2 [style=invis];
      en2 [label="Enterprise\nArchitecture" tooltip=""];
      en3 [label="Strategic\nPlanning" tooltip=""];
      en3 -> en4 [style=invis];
      en4 [label="Finance\nMgmt." tooltip=""];
      en5 [label="Legal Service\nMgmt." tooltip=""];
      en5 -> en6 [style=invis];
      en6 [label="HR\nMgmt." tooltip=""];
      en7 [label="Data\nGovernance" tooltip=""];
      en7 -> en8 [style=invis];
      en8 [label="Tech. Infrastructure\nMgmt." tooltip=""];
      en9 [label="Project\nMgmt." tooltip=""];
      en9 -> en10 [style=invis];
      en10 [label="Change\nMgmt." tooltip=""];
      en11 [label="Office\nMgmt." tooltip=""];
      en11 -> en12 [style=invis];
      en12 [label="Facilities\nMgmt." tooltip=""];
      en13 [label="Learning &\nDev." tooltip=""];
    }
  n1A3 -> ns1A [style=invis];
  ns1A -> en1 [style=invis];
}
