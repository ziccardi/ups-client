import * as nock from 'nock';
import axios from 'axios';
import {
  mockKeyCloak,
  mockUps,
  TEST_NEW_VARIANT_CREATED,
  TEST_NEW_VARIANT_TO_CREATE,
} from '../mocks/nockMocks';
import {findApplicationByID, mockData} from '../mocks/mockData';
import {VariantsAdmin} from '../../src/variants/VariantsAdmin';
import {AndroidVariant, IOSVariant} from '../../src/variants';
import {UPSMock, utils} from "../mocks/UPSMock";

const TEST_APP_ID = '2:2';
const TEST_VARIANT_ID = 'v-2:2';
const TEST_VARIANT_TYPE = 'android';
const WRONG_NAME = 'WRONG';

// beforeAll(() => {
//   mockUps();
//   mockKeyCloak();
// });
//
// afterAll(() => {
//   nock.restore();
// });

const BASE_URL = 'http://localhost:8888'

const upsMock = new UPSMock();

afterAll(() => {
  upsMock.uninstall();
});

beforeEach(() => {
  upsMock.initMock();
});

describe('Variants Admin', () => {
  const api = axios.create({baseURL: `${BASE_URL}/rest`});
  const variantAdmin = new VariantsAdmin();

  it('Should create an android variant', async () => {
    const IDs = utils.generateIDs(10);
    utils.generateApps(upsMock, 10, IDs.map(id => ({pushApplicationID: id})));

    const appId = IDs[7];

    const variant = await variantAdmin.create(api, appId, TEST_NEW_VARIANT_TO_CREATE);
    expect(variant).toMatchObject(TEST_NEW_VARIANT_TO_CREATE);
  });

  it('Should create an ios variant', async () => {
    const IDs = utils.generateIDs(10);
    utils.generateApps(upsMock, 10, IDs.map(id => ({pushApplicationID: id})));

    const appId = IDs[7];

    const IOSVARIANT = {
      type: 'ios',
      name: 'test',
      certificate: './test/resource/mockcert.p12',
      password: '123pwd123',
      production: false,
    } as IOSVariant;

    const variant = await variantAdmin.create(api, appId, IOSVARIANT);
    expect(variant.name).toEqual(IOSVARIANT.name);
  });

  it(`Should return all variants for app ${TEST_APP_ID}`, async () => {
    const IDs = utils.generateApps(upsMock, 10);
    const testAppNoVariants = IDs[5];
    const testAppId1 = IDs[2];
    const testAppId8 = IDs[8];

    const variants1 = utils.generateVariants(upsMock, testAppId1, 35, new Array(35).fill(
        {
          type: 'android',
          googleKey: '123456',
          projectNumber: '1234556'
        } as AndroidVariant))

    const variants8 = utils.generateVariants(upsMock, testAppId8, 12, new Array(12).fill(
        {
          type: 'ios',
          production: false,
          certificate: '123',
        } as IOSVariant))

    const foundVariants1 = await variantAdmin.find(api, testAppId1);
    expect(foundVariants1).toEqual(variants1);

    const foundVariants8 = await variantAdmin.find(api, testAppId8);
    expect(foundVariants8).toEqual(variants8);

  });
  //
  // it('Should return a given variant', async () => {
  //   const filteredVariants = await variantAdmin.find(api, TEST_APP_ID, {
  //     variantID: TEST_VARIANT_ID,
  //   });
  //   expect(filteredVariants).toEqual([
  //     mockData
  //       .find(app => app.pushApplicationID === TEST_APP_ID)!
  //       .variants!.find(variant => variant.variantID === TEST_VARIANT_ID),
  //   ]);
  // });
  //
  // it('Should return empty result', async () => {
  //   const filteredVariants = await variantAdmin.find(api, TEST_APP_ID, {
  //     name: WRONG_NAME,
  //   });
  //   expect(filteredVariants).toEqual([]);
  // });
  //
  // it('Should return all variants of a given type', async () => {
  //   const filteredVariants = await variantAdmin.find(api, TEST_APP_ID, {
  //     type: TEST_VARIANT_TYPE,
  //   });
  //   expect(filteredVariants).toEqual(
  //     findApplicationByID(TEST_APP_ID)!.variants!.filter(variant => variant.type === TEST_VARIANT_TYPE)
  //   );
  // });
  //
  //
  //
  // it('Should delete a variant', async () => {
  //   await variantAdmin.delete(api, TEST_APP_ID, {
  //     variantID: 'v-2:2',
  //   });
  //   const appDel = mockData.find(appDel => appDel.pushApplicationID === TEST_APP_ID)!;
  //   const varDel = appDel.variants!.find(variant => variant.variantID === 'v-2:2');
  //   expect(appDel.variants).not.toContain(varDel);
  // });
});
