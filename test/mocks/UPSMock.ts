import * as nock from 'nock';
import {Guid} from 'guid-typescript';
import {PushApplication} from '../../src/applications';
import {IOSVariant, Variant} from "../../src/variants";
const REST_APPLICATIONS_ENDPOINT = '/rest/applications';
const BASE_URL = 'http://localhost:8888';

class UPSImpl {
  private data: PushApplication[] = [];

  createApplication(newAppDef: PushApplication) {
    const newApp: PushApplication = {...(newAppDef as {})} as PushApplication;

    newApp.masterSecret = Guid.raw();
    newApp.pushApplicationID = newApp.pushApplicationID || Guid.raw();
    newApp.id = Guid.raw();
    newApp.developer = newApp.developer || 'admin';
    this.data.push(newApp);
    return newApp;
  }

  getApplications(id?: string, page = 1, itemPerPage = 10) {
    if (!id) {
      const firstIndex = itemPerPage * (page - 1);
      const endIndex = firstIndex + itemPerPage;

      return this.data.slice(firstIndex, endIndex);
    } else {
      return this.data.find(item => item.pushApplicationID === id);
    }
  }

  deleteApplication(id: string) {
    this.data = this.data.filter(item => item.pushApplicationID !== id);
  }

  // Variants
  createVariant(appId: string, variantDef: Variant) {
    const newVariant: Variant = { ...(variantDef as {})} as Variant;
    newVariant.variantID = newVariant.variantID || Guid.raw();
    newVariant.developer = newVariant.developer || 'admin';
    newVariant.secret = Guid.raw();
    newVariant.id = Guid.raw();

    const app = this.data.find(item => item.pushApplicationID === appId)!;
    app.variants = app.variants || [];
    app.variants.push(newVariant);

    return newVariant;
  }
}

export class UPSMock {
  private mock = nock(BASE_URL);
  private ups = new UPSImpl();

  private mockCreateApplication() {
    this.mock = this.mock.post(REST_APPLICATIONS_ENDPOINT).reply(200, (uri: string, requestBody: nock.Body) => {
      return this.ups.createApplication(requestBody as PushApplication);
    });
  }

  private mockGetApplications() {
    // get all applications
    this.mock = this.mock.get(/rest\/applications\?/).reply(200, (uri: string, requestBody: nock.Body) => {
      return this.ups.getApplications();
    });

    // get application by id

    this.mock = this.mock.get(/rest\/applications\/([^/]+)\?/).reply(200, (uri: string, requestBody: nock.Body) => {
      const urlWithParam = /rest\/applications\/([^/]+)\?/;
      const urlParams = urlWithParam.exec(uri)!;
      const appId = urlParams[1];
      return this.ups.getApplications(appId);
    });

    this.mock = this.mock.get(/rest\/applications\/([^/]+)$/).reply(200, (uri: string, requestBody: nock.Body) => {
      const urlWithParam = /rest\/applications\/([^/]+)$/;
      const urlParams = urlWithParam.exec(uri)!;
      const appId = urlParams[1];
      return this.ups.getApplications(appId);
    });
  }

  private mockDeleteApplication() {
    this.mock = this.mock.delete(/rest\/applications\/([^/]+)/).reply((uri: string, requestBody: nock.Body) => {
      const urlWithParam = /rest\/applications\/([^/]+)/;
      const urlParams = urlWithParam.exec(uri)!;
      const appId = urlParams[1];

      const app = this.ups.getApplications(appId);
      if (!app) {
        return [404, `Application with id ${appId} not found`];
      }

      this.ups.deleteApplication(appId);
      return [204];
    });
  }

  private mockCreateAndroidVariant() {
    this.mock = this.mock.post(/rest\/applications\/([^/]+)\/android/).reply((uri: string, requestBody: nock.Body) => {
      const regex = /rest\/applications\/([^/]+)/;
      const urlParams = regex.exec(uri)!;
      const appId = urlParams[1];

      const app = this.ups.getApplications(appId);
      if (!app) {
        return [404, `App with id '${appId}' not found`];
      }

      return [
          201,
          this.ups.createVariant(appId, requestBody as Variant)
          ];
    });
  }

  private mockCreateiOSVariant() {
    this.mock = this.mock.post(/rest\/applications\/([^/]+)\/ios/).reply((uri: string, requestBody: nock.Body) => {
      const regex = /rest\/applications\/([^/]+)/;
      const urlParams = regex.exec(uri)!;
      const appId = urlParams[1];

      const app = this.ups.getApplications(appId);
      if (!app) {
        return [404, `App with id '${appId}' not found`];
      }

      // Extract data from the multipart form
      const lines = requestBody.split('\n');
      const formData: Record<string, string> = {};
      let fieldName: string = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('----')
          || lines[i].replace(/(\r\n|\n|\r)/gm,"").length === 0
          || lines[i].startsWith('Content-Type')) {
          // skip
          continue;
        }

        if (lines[i].startsWith('Content-Disposition')) {
          // get field name
          fieldName = /.*name="(.*)".*/.exec(lines[i])![1];
          continue;
        }

        // If we reach this step, we found the value
        //console.log('Value: ', lines[i].replace(/(\r\n|\n|\r)/gm,""));
        formData[fieldName] = lines[i].replace(/(\r\n|\n|\r)/gm,"");
      }
      //console.log(formData);
      const variantDef = formData as unknown as IOSVariant;
      variantDef.type = 'ios';

      return [201, this.ups.createVariant(appId, variantDef)];
      // return [
      //   201,
      //   this.ups.createVariant(appId, requestBody as Variant)
      // ];
    });
  }

  initMock() {
    this.ups = new UPSImpl();
    this.mock = nock(BASE_URL);

    // Applications
    this.mockCreateApplication();
    this.mockGetApplications();
    this.mockDeleteApplication();

    // Variants
    this.mockCreateAndroidVariant();
    this.mockCreateiOSVariant();

    this.mock.persist(true);
  }

  uninstall() {
    nock.restore();
  }

  getImpl() {
    return this.ups;
  }
}

export const utils = {
  generateApps : (upsMock: UPSMock, count: number, customAttrs?: Record<string, string>[]) => {
    const APP_NAME_PREFIX = 'TEST APPLICATION';

    const getAttr = (index: number, attName: string) => {
      if (customAttrs && customAttrs.length > index) {
        return customAttrs[index][attName];
      }

      return undefined;
    };

    const genName = (index: number) => {
      return `${APP_NAME_PREFIX} ${index}`;
    };

    const ids : string[] = [];

    for (let i = 0; i < count; i++) {
      const app = upsMock.getImpl().createApplication({
        name: `${getAttr(i, 'name') || genName(i)}`,
        developer: getAttr(i, 'developer') || 'admin',
        pushApplicationID: getAttr(i, 'pushApplicationID'),
      });

      ids.push(app.pushApplicationID!);
    }

    return ids;
  },
  generateVariants : (upsMock: UPSMock, appId: string, count: number, customAttrs: Record<string, string>[]) => {
    const VARIANT_NAME_PREFIX = 'TEST VARIANT';

    const variants = [];

    for (let i = 0; i < count; i++) {
      variants.push(upsMock.getImpl().createVariant(appId, {
        name: `${VARIANT_NAME_PREFIX} ${i}`,
        developer: 'admin',
        variantID: Guid.raw(),
        ...(customAttrs ? customAttrs[i] : {})
      } as Variant));
    }
    return variants;
  },
  generateIDs : (count: number) => {
    const res: string[] = [];
    for (let i = 0; i < count; i++) {
      res.push(Guid.raw());
    }
    return res;
  }
};
